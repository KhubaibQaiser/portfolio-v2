# ADR 0003 — Candidate Profile MCP server: a new network trust boundary

- **Status:** Accepted
- **Date:** 2026-08-19
- **Deciders:** Khubaib (with AI pairing)

## Context

`packages/agent-mcp` is a local, unauthenticated, stdio-only MCP server that
gives coding agents read-only access to ADRs and AI module contracts. It has
no network exposure and no auth by design — the trust boundary is "whoever
can spawn the process on the developer machine."

We now want an MCP server that **external automation** (initially an n8n
workflow, later Apify actors) can call over the network to read the
candidate's profile data (about, resume, experience, skills, projects,
testimonials, site config) — the same content already public on
`khubaibqaiser.com` — as the foundation for a later job-matching/tailored-
application pipeline. This is a categorically different trust boundary:
network-reachable, called by processes we don't control the host of, and
visible to anyone who inspects the deployed infrastructure. It does not
belong in `packages/agent-mcp`.

## Decision

Add a new deployable app, **`apps/candidate-mcp`**, deployed via a new CDK
stack (`Portfolio-CandidateMcp`) in the *same* AWS account and CDK app as the
rest of the site, reading the *same* DynamoDB tables through the existing
`ContentRepository` port — but isolated and authenticated as follows.

### 1. Authorization: OAuth 2.1 client-credentials via Amazon Cognito, not static tokens or a custom auth server

The MCP authorization spec's guidance for remote servers is OAuth 2.1 with
short-lived, audience-bound tokens validated server-side; token passthrough
is explicitly forbidden. For machine-to-machine callers with no human end
user to consent, the correct grant is **client credentials** (RFC 6749
§4.4) — not the authorization-code+PKCE flow used by user-delegated clients
such as Claude.ai connecting on behalf of a signed-in person.

Building a bespoke OAuth authorization server would be over-engineering for
a single-tenant project. **Amazon Cognito already provides this as a managed
service**:

- A dedicated User Pool on the **Lite** feature plan (no advanced-security
  features needed; M2M billing is separate from MAU billing regardless of
  plan).
- A **Resource Server** identified by `https://mcp.khubaibqaiser.com` with
  one custom scope, `profile.read`.
- One **App Client per named consumer** (e.g. `n8n-workflow`,
  `manual-testing`), each with the `client_credentials` grant enabled, a
  Cognito-managed client secret, and the `profile.read` scope. Adding a new
  consumer (Apify) later is a CDK/console change only — no code changes.
- Cost: Cognito M2M billing is $0.00225 per 1,000 successful token
  requests, with no per-app-client fee (removed Nov 2025) — negligible
  against the ~$5/mo budget in ADR 0002.

Access tokens are short-lived JWTs (30 minutes). Client-credentials has no
refresh token by design: the caller just re-requests a token with its
`client_id`/`client_secret`, which bounds the blast radius of a leaked token
far better than a long-lived static key would.

**Verification happens inside the Lambda**, using AWS's own
[`aws-jwt-verify`](https://github.com/aws-powertools/aws-jwt-verify)
(purpose-built for Cognito tokens): signature via cached JWKS (RS256
pinned — no `alg: none` confusion), `iss` matches the user pool,
`token_use === "access"`, `exp` not expired, and `scope` contains
`https://mcp.khubaibqaiser.com/profile.read`. This is the audience-binding
substitute for a generic `aud` claim: only app clients explicitly granted
this resource server's scope can produce a token that passes verification,
satisfying the spec's "MUST NOT accept tokens not issued for this server."

We deliberately do **not** put a Cognito authorizer in front of an API
Gateway. This repo has no API Gateway anywhere (Lambda + CloudFront only,
per the existing `NextjsSite`/`StaticSite` constructs), and a Cognito
authorizer requires one. Verifying the JWT inside the Lambda with a
well-vetted library keeps the same "no API Gateway" posture while achieving
equivalent security.

The server also implements the MCP spec's discovery surface for full
compliance beyond the concrete n8n integration: an unauthenticated request
gets a `401` with a `WWW-Authenticate` header pointing at
`/.well-known/oauth-protected-resource` (RFC 9728), which advertises the
Cognito issuer and the required scope.

**No token passthrough, no cross-system credentials:** this server's
Cognito-issued tokens are a disjoint system from the admin app's Better Auth
sessions. The MCP server never accepts, forwards, or conflates the two.

### 2. Isolation from the production site: CloudFront OAC + reserved Lambda concurrency, not a separate AWS account

The candidate-mcp Lambda shares the AWS account and DynamoDB tables with
`apps/web`/`apps/admin` (simplest, consistent with the rest of the
architecture, and this data is already effectively public). Blast radius is
bounded by two independent, cheap controls instead of full account
isolation:

- **`reservedConcurrentExecutions`** on the candidate-mcp Lambda (a small
  fixed cap). This both reserves that headroom for the function and hard-caps
  it, so a flood against this endpoint can neither starve nor be starved by
  the concurrency `apps/web`/`apps/admin` need.
- **CloudFront Origin Access Control (OAC)** in front of the Lambda Function
  URL: the Function URL's `authType` is `AWS_IAM`, and CDK's
  `FunctionUrlOrigin.withOriginAccessControl()` grants exactly the
  `cloudfront.amazonaws.com` principal, scoped to this distribution's ARN,
  `lambda:InvokeFunctionUrl`. The raw `*.lambda-url.*.on.aws` address becomes
  uninvokable directly — all traffic must go through
  `mcp.khubaibqaiser.com`. This is a network-layer control independent of
  the Cognito JWT check (an application-layer identity control) — two
  separate failure domains have to both be bypassed, not one.
- **Read-only IAM.** The Lambda's role grants only
  `dynamodb:{GetItem,BatchGetItem,Query,Scan,DescribeTable}` on the
  `${tablePrefix}-*` ARN pattern (a new `grantMcpDataAccess`, mirroring
  `grantWebDataAccess` but without any S3 grant — profile responses only
  ever include URLs, never object bytes) and `secretsmanager:GetSecretValue`
  scoped to nothing (Cognito needs no application-managed secret; the
  client secret lives in Cognito itself).

### 3. Standing invariants for future phases

Written down now, while free, because the roadmap's later job-board-scraping
phase will want exactly the tool shape these rules pre-empt:

- **No SSRF surface.** No tool may fetch a server-side URL supplied by a
  caller without validating it against an explicit allowlist.
- **Output sanitization.** Every free-text profile field returned by a tool
  (bios, experience descriptions, testimonials, resume summary) is passed
  through the existing prompt-injection scrub
  (`packages/ai/src/guardrails/prompt-injection.ts`) before leaving the
  server. These tool outputs land directly in the calling agent's LLM
  context — the same output-poisoning risk class the resume-AI pipeline
  already guards against on the input side, mirrored here on the output
  side.
- **Any future write-capable tool** (job matches, tracked applications, and
  eventually an "apply" action) requires its own ADR and a human-in-the-loop
  gate analogous to `enforceResumeGenerationPolicy` /
  `validateFabrication` — unvalidated model or agent output must never
  reach a real side effect (submitting an application, sending an email)
  without review.

## Approaches considered

### A. Extend `packages/agent-mcp` with new tools — _rejected_

Would conflate a trusted local dev-tool process with a network-reachable,
externally-authenticated service. Different trust boundary, different
deployment target (nothing today deploys `agent-mcp` to AWS), different
consumers. Keeping them separate keeps each one's threat model simple.

### B. Static per-client bearer tokens in Secrets Manager — _rejected_

Simpler to build, but a shared-secret model with no standard expiry,
rotation, or scoping story, and it doesn't follow the MCP spec's explicit
recommendation for remote servers. Cognito gives short-lived, scoped,
revocable tokens as a managed service for negligible cost — the "boring,
managed service" choice here is *more* protocol-correct, not less.

### C. API Gateway + Cognito authorizer — _rejected (for now)_

Would give a fully managed authorizer, but introduces a service this repo
otherwise avoids entirely, plus its own cost line. In-Lambda verification
with `aws-jwt-verify` gets equivalent guarantees without adding API Gateway
as a new architectural element.

### D. Full account isolation — _rejected (for now)_

Would fully separate blast radius but adds real operational overhead
(cross-account IAM, a second deploy pipeline) disproportionate to a
single-tenant, read-only, already-public dataset. Reserved concurrency + OAC
+ read-only IAM cover the realistic failure modes (cost runaway, availability
starvation, data write) at a fraction of the complexity.

## Consequences

- **Positive:** a real, network-reachable, spec-compliant MCP server exists
  today; adding a new consumer (Apify) is a Cognito app-client change, not a
  code change; the production site's availability/budget can't be affected
  by this endpoint being hammered or probed.
- **Negative / trade-offs:** Cognito is a new architectural element with its
  own (small) learning curve and cost line; DCR (self-service client
  registration) is out of scope — new consumers are provisioned by us, which
  is correct for a small set of self-operated clients but would need
  revisiting if this ever accepted arbitrary third-party MCP clients.
- **Follow-up:** any write-capable tool (job matches, applications) needs a
  new ADR before implementation, per the standing invariant above.
