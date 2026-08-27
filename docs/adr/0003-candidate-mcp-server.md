# ADR 0003 — Candidate Profile MCP server: a new network trust boundary

- **Status:** Accepted (identity: [ADR 0006](0006-candidate-mcp-oauth.md) OAuth 2.1; ADR 0005 API keys superseded)
- **Date:** 2026-08-19 (network layer amended 2026-08-20: origin-verify
  replaces Function URL OAC so MCP Bearer can pass through)
- **Deciders:** Khubaib (with AI pairing)

## Context

> **2026-08-27 (auth):** HTTP identity is OAuth 2.1 with Cognito as AS per
> [ADR 0006](0006-candidate-mcp-oauth.md). [ADR 0005](0005-candidate-mcp-api-keys.md)
> (hashed API keys) is superseded.

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
stack (`Portfolio-CandidateMcp`) in the _same_ AWS account and CDK app as the
rest of the site, reading the _same_ DynamoDB tables through the existing
`ContentRepository` port — but isolated and authenticated as follows.

### 1. Authorization: OAuth 2.1 via Amazon Cognito — see ADR 0006

> **2026-08-27:** Current identity is **OAuth 2.1** (Cognito AS + MCP resource
> server) per [ADR 0006](0006-candidate-mcp-oauth.md), including authorization
> code + PKCE for interactive clients and client_credentials for M2M.
> [ADR 0005](0005-candidate-mcp-api-keys.md) briefly used hashed API keys and
> is superseded. The original M2M-focused Cognito notes below remain useful
> background for n8n / smoke.

The MCP authorization spec's guidance for remote servers is OAuth 2.1 with
short-lived, audience-bound tokens validated server-side; token passthrough
is explicitly forbidden. For machine-to-machine callers with no human end
user to consent, the correct grant is **client credentials** (RFC 6749
§4.4) — not the authorization-code+PKCE flow used by user-delegated clients
such as Claude.ai connecting on behalf of a signed-in person.

Building a bespoke OAuth authorization server would be over-engineering for
a single-tenant project. **Amazon Cognito already provides this as a managed
service**:

- A dedicated User Pool on the **Lite** feature plan (`FeaturePlan.LITE`;
  no human ever signs in to this pool, so the MAU-priced Essentials/Plus
  tiers buy nothing here — M2M token-request billing is separate from the
  feature-plan tier regardless).
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

### 2. Isolation from the production site: CloudFront origin-verify, not OAC and not a separate AWS account

The candidate-mcp Lambda shares the AWS account and DynamoDB tables with
`apps/web`/`apps/admin` (simplest, consistent with the rest of the
architecture, and this data is already effectively public). Blast radius is
bounded by cheap controls instead of full account isolation:

- **No `reservedConcurrentExecutions`.** AWS Lambda requires at least 10
  unreserved concurrent executions after any reservation. This personal
  account's ConcurrentExecutions quota is 10, so reserving even 5 fails
  create with `UnreservedConcurrentExecution below its minimum value of [10]`.
  Revisit a small reserved cap after a quota increase. Until then, cost and
  flood risk stay bounded by CloudFront origin-verify, Cognito, the 10s
  timeout, and the account-wide unreserved pool shared with web/admin.
- **CloudFront origin-verify, not Function URL OAC.** Remote MCP requires
  `Authorization: Bearer` to reach the app unchanged (OAuth 2.1 / RFC 9728).
  CloudFront OAC on a Lambda Function URL uses that same header for SigV4:
  `SigningBehavior: always` overwrites the JWT; `no-override` leaves Bearer
  in place and the Function URL rejects it as a bad signature. POST bodies
  also need an `x-amz-content-sha256` hash that MCP clients must not be
  taught. **Web/admin keep OAC** — they authenticate with cookies, not
  `Authorization`. Candidate-mcp therefore uses Function URL `AuthType:
NONE` plus a CloudFront **origin custom header** `x-origin-verify`
  (CloudFront overwrites any viewer copy). Viewer `Authorization` is
  forwarded with managed **CachingDisabled** +
  **AllViewerExceptHostHeader** — the AWS-supported combination when
  caching is fully off. A custom CachePolicy that whitelists
  `Authorization` with all TTLs = 0 is rejected by CloudFront
  (`HeaderBehavior is invalid for policy with caching disabled`); a
  custom OriginRequestPolicy cannot whitelist `Authorization` alone.
  Do not paper over that with `maxTtl: 1` (auth-keyed cache window).
  The origin-verify value is a CDK-generated Secrets Manager secret,
  distinct from the n8n Cognito client secret. CloudFormation injects it
  into the origin header and the Lambda environment via a dynamic
  reference (not a plaintext string in source, templates-as-committed, or
  CfnOutputs). The handler fail-closes with a uniform `403` when it is
  missing or wrong. Direct `*.lambda-url.*.on.aws` callers never have the
  secret. This is a network-layer control independent of the Cognito JWT
  check (application-layer identity) — two separate failure domains.
- **`WWW-Authenticate` restored at the edge.** Lambda Function URLs remap
  `WWW-Authenticate` to `x-amzn-remapped-www-authenticate`. A CloudFront
  Function on viewer-response copies it back so unauthenticated clients
  can follow RFC 9728 discovery.
- **Read-only, table-scoped IAM.** `grantCandidateMcpDataAccess` (in
  `packages/infra/src/naming.ts`) grants
  `dynamodb:{GetItem,BatchGetItem,Query,Scan,DescribeTable}` on exactly the
  five tables the two tools read — `content`, `experience`, `project`,
  `skill`, `testimonial` (plus their GSIs) — and nothing else: no S3 grant
  (profile responses only ever include URLs, never object bytes) and no
  access to `resume-generation`, `media`, or `chat-cache`. This is tighter
  than `grantWebDataAccess`'s `${tablePrefix}-*` wildcard, which is
  appropriate given this Lambda is reachable by processes we don't control.
  The one write permission it does have is a single `dynamodb:UpdateItem`
  on the `rate-limit` table, for its own per-`client_id` counters.
- **The Cognito app-client secret lives in Secrets Manager, not just
  Cognito.** Cognito already holds the source of truth, but whoever
  configures the n8n credential (or this repo's own post-deploy smoke
  test) needs to read it once without Cognito console access. CDK writes
  it into a dedicated, CDK-owned secret (`secretObjectValue` built from
  `UserPoolClient.userPoolClientSecret` — a CloudFormation `Fn::GetAtt`,
  never a plaintext string in the template) rather than a `CfnOutput`,
  which would otherwise leak it into CloudFormation console history and CI
  logs. `CandidateMcpStack`'s own test suite asserts this shape.

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

### 4. Testing: real CDK synth + fixture-backed unit tests in CI, not a third-party MCP scanner

`packages/infra/src/stacks/candidate-mcp-stack.test.ts` uses
`aws-cdk-lib/assertions` against a real synth of this stack (including real
esbuild bundling of `apps/candidate-mcp/src/lambda.ts`), asserting the
invariants above as code: client-credentials-only Cognito, the secret
landing in Secrets Manager via `Fn::GetAtt` and never in a `CfnOutput`, the
Function URL's `NONE` auth type (OAuth Bearer must not collide with OAC
SigV4), origin-verify on the CloudFront origin, and the exact five-table
IAM scope.
Combined with `apps/candidate-mcp`'s own auth/sanitize/rate-limit/HTTP-layer
tests, this all runs in a dedicated `mcp-security` CI job (see
`.github/workflows/ci.yml`) gating deploy, entirely offline.

We deliberately did **not** wire `mcp-scan` (Invariant Labs) or a similar
scanner into CI: its deep prompt-injection checks call an external
Guardrails API with this server's tool descriptions on every invocation,
which is a data-sharing and non-determinism trade-off that shouldn't be
made silently in a required, unattended CI gate. It remains a recommended
**manual, pre-release** check (`npx mcp-scan@latest scan` against the
stdio dev entry point) rather than an automated one.

A post-deploy smoke test (`pnpm smoke-test:candidate-mcp`, run in the
deploy job once `DOMAIN_ENABLED`) exercises the real deployed endpoint:
confirms an unauthenticated request gets a real `401`, then runs an actual
client-credentials grant against Cognito and a real authenticated
`initialize` call — the same failure mode a `cdk synth`-only check cannot
catch (e.g. a misconfigured resource-server identifier or origin-verify).

## Approaches considered

### A. Extend `packages/agent-mcp` with new tools — _rejected_

Would conflate a trusted local dev-tool process with a network-reachable,
externally-authenticated service. Different trust boundary, different
deployment target (nothing today deploys `agent-mcp` to AWS), different
consumers. Keeping them separate keeps each one's threat model simple.

### B. Static per-client bearer tokens in Secrets Manager — _superseded by ADR 0005_

Originally rejected as a shared-secret model. ADR 0005 adopts **hashed,
admin-minted, revocable** API keys instead — not plaintext secrets in git.

### C. API Gateway + Cognito authorizer — _rejected (for now)_

Would give a fully managed authorizer, but introduces a service this repo
otherwise avoids entirely, plus its own cost line. In-Lambda verification
with `aws-jwt-verify` gets equivalent guarantees without adding API Gateway
as a new architectural element.

### D. Full account isolation — _rejected (for now)_

Would fully separate blast radius but adds real operational overhead
(cross-account IAM, a second deploy pipeline) disproportionate to a
single-tenant, read-only, already-public dataset. Origin-verify + Cognito

- read-only IAM cover the realistic failure modes (cost runaway,
  availability starvation, data write) at a fraction of the complexity.

### E. CloudFront OAC on the MCP Function URL — _rejected_

Correct for `NextjsSite` (cookie auth). Incompatible with MCP: OAC SigV4
and OAuth both need `Authorization`, and unsigned POST bodies fail with
`InvalidSignatureException` before the app can return a spec `401`.

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
