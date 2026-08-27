# ADR 0006 — Candidate MCP OAuth 2.1 (supersedes API-key identity)

- **Status:** Accepted
- **Date:** 2026-08-27
- **Deciders:** Khubaib (with AI pairing)
- **Supersedes:** [ADR 0005](0005-candidate-mcp-api-keys.md) (hashed API keys / no OAuth discovery)

## Context

ADR 0005 replaced Cognito client-credentials with hashed API keys so Claude.ai
could use Authentication → None + a static Bearer header. In practice Claude
Connect and MCP Inspector still run the **MCP Authorization** discovery ladder
(unauthenticated `POST /mcp` → RFC 9728 PRM → AS metadata → DCR/authorize).
Our bare `401` without `WWW-Authenticate` and gated `/.well-known/*` broke that
ladder. Request-header auth is a Claude product beta, not the MCP auth spec.

## Decision

Treat `apps/candidate-mcp` as an OAuth 2.1 **resource server** per
[MCP Authorization (2025-06-18)](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization):

1. **Authorization server:** Amazon Cognito User Pool on `CandidateMcpStack`
   (hosted domain for `/oauth2/authorize` and `/oauth2/token`).
2. **Grants:**
   - Interactive clients (Claude.ai, Inspector): authorization code + PKCE.
   - M2M (n8n, CI smoke): client credentials (confidential app client; secret
     in Secrets Manager).
3. **Public discovery (no Bearer):** RFC 9728 PRM at
   `/.well-known/oauth-protected-resource` and `.../mcp`; AS metadata mirrored
   from Cognito (RFC 8414 / OIDC probes).
4. **401 challenges:** RFC 6750 `WWW-Authenticate: Bearer` with absolute
   `resource_metadata` (RFC 9728 §5.1). Invalid tokens include
   `error="invalid_token"`.
5. **DCR (SHOULD):** `POST /register` on the MCP origin creates a Cognito
   public app client (PKCE) with an allowlisted redirect URI prefix; rate-limited.
6. **Token verify:** `aws-jwt-verify` Cognito access tokens; required scope
   `{resourceServer}/profile.read`; `clientId` from JWT for rate limits/audit.
7. **API keys:** retired as HTTP MCP identity (ADR 0005 superseded). Dynamo
   `mcp-api-key` table may remain unused.
8. **Network:** origin-verify, Host allowlist, Claude Origin CORS allowlist,
   RestoreWwwAuthenticate CloudFront Function (Function URL remapping).

## Consequences

- **Positive:** Spec-conformant Connect for Claude/Inspector/any OAuth MCP
  client; n8n uses short-lived client-credentials tokens; clear 401 challenges.
- **Negative:** Cognito cost/ops return; Hosted UI needs an operator user (or
  IdP) for interactive login; DCR creates Cognito app clients (bounded by
  redirect allowlist + rate limit).
- **Cutover:** Redeploy recreates Cognito; update n8n to client_credentials;
  Claude uses Authentication → Always required (not Auth None + API key).
