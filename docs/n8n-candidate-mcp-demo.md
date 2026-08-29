# n8n / Claude / Inspector: candidate-mcp OAuth

Phase 1 demo for [ADR 0003](adr/0003-candidate-mcp-server.md) and
[ADR 0006](adr/0006-candidate-mcp-oauth.md): call the deployed candidate MCP
server with **OAuth 2.1**. Auth None + static API keys are retired.

Any OAuth MCP client uses the same discovery ladder. n8n does not ship a native
MCP client node, so that workflow uses **HTTP Request** nodes + client
credentials.

## Prerequisites

- `Portfolio-CandidateMcp` deployed (`domainEnabled=true`).
- Cognito credentials for M2M: Secrets Manager
  `/portfolio/candidate-mcp/n8n-workflow-client`
  (`clientId`, `clientSecret`, `tokenEndpoint`, `scope`).
- Interactive Hosted UI: create one Cognito user in the agent pool after
  first deploy. Stack output `ClaudeClientId` is a **fallback** pre-registered
  PKCE client if DCR fails.

## Discovered authorization server

- Issuer / PRM `authorization_servers`: `https://mcp.khubaibqaiser.com`
- AS metadata: `https://mcp.khubaibqaiser.com/.well-known/oauth-authorization-server`
  (`issuer` must equal that origin; includes `registration_endpoint`)
- Authorize/token URLs in that document point at Cognito hosted domain
- DCR: `POST https://mcp.khubaibqaiser.com/register`

## Resource indicator

When a client supports RFC 8707, set
`resource=https://mcp.khubaibqaiser.com/mcp` on authorize/token requests.

## n8n (client_credentials)

1. **Get token** (HTTP Request):
   - Method `POST`, URL = `tokenEndpoint` from the secret (or AS metadata
     `token_endpoint`).
   - Authentication: Basic (`clientId` / `clientSecret`).
   - Body (form): `grant_type=client_credentials`, `scope=<scope from secret>`.
   - Store `access_token` (≈1h). Re-fetch when expired.

2. **MCP tools/call** (legacy initialize path — still supported):
   - `POST https://mcp.khubaibqaiser.com/mcp`
   - Headers: `Content-Type: application/json`,
     `Accept: application/json, text/event-stream`,
     `Authorization: Bearer <access_token>`.
   - Session headers are optional: the server dual-serves **stateless**
     legacy initialize and modern `2026-07-28` (no sticky `Mcp-Session-Id`
     required). Prefer an MCP SDK Client when exercising modern era.

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-06-18",
    "capabilities": {},
    "clientInfo": { "name": "n8n-demo", "version": "1.0.0" }
  }
}
```

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": { "name": "get_candidate_profile", "arguments": {} }
}
```

Post-deploy smoke (`pnpm smoke-test:candidate-mcp`) validates OAuth discovery
plus **both** protocol eras (legacy Client + pinned `2026-07-28`) against the
live URL after `client_credentials`.
## Interactive clients (Claude.ai, Inspector, others)

1. Point the client at `https://mcp.khubaibqaiser.com/mcp`.
2. Use OAuth (Claude: Authentication → **Always required**). Do **not** use
   Auth → None + a static Authorization header.
3. Client should complete PRM → AS metadata → `POST /register` (DCR) → Cognito
   Hosted UI (auth-code + PKCE).
4. If DCR fails, Advanced → paste stack output `ClaudeClientId` (fallback).
5. Sign in with a Cognito user in the agent pool.
6. Inspector: Protocol Era **legacy** (default) or **modern** both work;
   use Era=`modern` to exercise `2026-07-28` sessionless handshake.

## Claude Code

Prefer OAuth (`claude mcp add` with the HTTP URL and OAuth flow). Do not rely on
a long-lived static Bearer header against this server.

## Troubleshooting

| Symptom                                  | Cause                                                                                          |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `401` + `WWW-Authenticate: Bearer`       | Missing/expired/invalid access token — re-run OAuth or client_credentials.                     |
| `401` with `error="invalid_token"`       | Bearer present but JWT verify failed (wrong pool, scope, or signature).                        |
| Issuer mismatch on AS metadata           | Bug — `issuer` must equal `https://mcp…` (ADR 0006 facade).                                    |
| “Automatic registration isn’t supported” | Client did not see `registration_endpoint` on discovered AS — check AS metadata on MCP origin. |
| Discovery `401` on `/.well-known/*`      | Bug — those routes must be public (ADR 0006).                                                  |
| `403 {"error":"forbidden"}`              | Bypassed CloudFront (direct Function URL) or bad Origin.                                       |
| `429 {"error":"rate_limited"}`           | Per-IP or per-client limit — wait and retry.                                                   |
| `503 {"error":"service_unavailable"}`    | `MCP_ENABLED=false` kill switch.                                                               |
| Hosted UI has no user                    | Create a Cognito user in the candidate-mcp agent pool.                                         |
