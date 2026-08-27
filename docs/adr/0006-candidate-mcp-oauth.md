# ADR 0006 — Candidate MCP OAuth 2.1 (supersedes API-key identity)

- **Status:** Accepted (amended: MCP-origin AS facade for discovery/DCR)
- **Date:** 2026-08-27
- **Deciders:** Khubaib (with AI pairing)
- **Supersedes:** [ADR 0005](0005-candidate-mcp-api-keys.md) (hashed API keys / no OAuth discovery)

## Context

ADR 0005 replaced Cognito client-credentials with hashed API keys so Claude.ai
could use Authentication → None + a static Bearer header. In practice MCP
clients run the **MCP Authorization** discovery ladder (unauthenticated
`POST /mcp` → RFC 9728 PRM → AS metadata → DCR/authorize). Bare `401` without
`WWW-Authenticate` and gated `/.well-known/*` broke that ladder.

Serving Cognito’s user-pool URL as `issuer` from the MCP host also failed RFC
8414 §3.3 (issuer must match the URL used to fetch AS metadata). Pointing PRM
`authorization_servers` at Cognito hid DCR: Cognito has no
`registration_endpoint`, so clients reported “automatic registration isn’t
supported.”

## Decision

Treat `apps/candidate-mcp` as an OAuth 2.1 **resource server** per
[MCP Authorization (2025-06-18)](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization),
with a **metadata facade** so any MCP client discovers one AS:

1. **Discovered authorization server issuer:** the MCP public origin
   (`https://mcp.<domain>`). PRM `authorization_servers` and AS metadata
   `issuer` both use this value (RFC 8414 / RFC 9728).
2. **Token/login backend:** Amazon Cognito User Pool on `CandidateMcpStack`
   (hosted UI `/oauth2/authorize`, `/oauth2/token`). Access-token JWT `iss`
   remains the Cognito user-pool issuer; the RS verifies with
   `aws-jwt-verify`.
3. **Grants:**
   - Interactive clients: authorization code + PKCE.
   - M2M (n8n, CI smoke): client credentials (secret in Secrets Manager).
4. **Public discovery (no Bearer):** RFC 9728 PRM; AS metadata (and OIDC
   probes if served) on the MCP origin with MCP `issuer`.
5. **401 challenges:** RFC 6750 `WWW-Authenticate: Bearer` with absolute
   `resource_metadata`. Invalid tokens include `error="invalid_token"`.
6. **DCR (SHOULD):** `POST /register` on the MCP origin (advertised on the
   discovered AS) creates a Cognito public app client (PKCE) with an
   allowlisted redirect URI prefix; rate-limited; unknown connector fields
   ignored.
7. **API keys:** retired as HTTP MCP identity (ADR 0005 superseded).
8. **Network:** origin-verify, Host allowlist, connector Origin CORS
   allowlist, RestoreWwwAuthenticate CloudFront Function.

## Consequences

- **Positive:** Spec-conformant discovery/DCR for Inspector, Claude, and
  other OAuth MCP clients; n8n uses short-lived client_credentials; one
  agent-agnostic ladder.
- **Negative:** Cognito ops return; Hosted UI needs an operator user; DCR
  creates Cognito app clients (allowlist + rate limit); discovered metadata
  issuer and Cognito JWT `iss` differ (document; revisit if a client enforces
  equality).
- **Cutover:** Interactive clients should DCR automatically; pre-registered
  `ClaudeClientId` remains a fallback. n8n reads the SM client-credentials
  secret.
