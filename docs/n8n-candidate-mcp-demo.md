# n8n / Claude / Inspector: candidate-mcp OAuth

Phase 1 demo for [ADR 0003](adr/0003-candidate-mcp-server.md) and
[ADR 0006](adr/0006-candidate-mcp-oauth.md): call the deployed candidate MCP
server with **OAuth 2.1**. Auth None + static API keys are retired.

n8n does not ship a native MCP client node, so the workflow uses **HTTP Request**
nodes against Streamable HTTP. Claude.ai and MCP Inspector use the standard
discovery ladder (PRM → AS → authorize / DCR).

## Prerequisites

- `Portfolio-CandidateMcp` deployed (`domainEnabled=true`).
- Cognito credentials for M2M: Secrets Manager
  `/portfolio/candidate-mcp/n8n-workflow-client`
  (`clientId`, `clientSecret`, `tokenEndpoint`, `scope`).
- For Claude Hosted UI: create one Cognito user in the agent pool (console) after
  first deploy. Stack output `ClaudeClientId` is the pre-registered PKCE client.

## Resource indicator

When a client supports RFC 8707, set
`resource=https://mcp.khubaibqaiser.com/mcp` on authorize/token requests.

## n8n (client_credentials)

1. **Get token** (HTTP Request):
   - Method `POST`, URL = `tokenEndpoint` from the secret.
   - Authentication: Basic (`clientId` / `clientSecret`).
   - Body (form): `grant_type=client_credentials`, `scope=<scope from secret>`.
   - Store `access_token` (≈1h). Re-fetch when expired.

2. **MCP initialize** / **tools/call**:
   - `POST https://mcp.khubaibqaiser.com/mcp`
   - Headers: `Content-Type: application/json`,
     `Accept: application/json, text/event-stream`,
     `Authorization: Bearer <access_token>`.
   - Capture `Mcp-Session-Id` from initialize for later calls.

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

## Claude.ai (Always required / Detected OAuth)

1. Customize → Connectors → URL `https://mcp.khubaibqaiser.com/mcp`.
2. **Authentication → Always required** (Detected OAuth). Do **not** use
   Auth → None + Authorization header for this server.
3. Complete Cognito Hosted UI login.
4. If DCR fails, Advanced → paste stack output `ClaudeClientId`.
5. Enable the connector; call `get_candidate_facts` before tailoring a JD.

## MCP Inspector

1. Connect to `https://mcp.khubaibqaiser.com/mcp` with OAuth.
2. Discovery should hit `401` + `WWW-Authenticate` →
   `/.well-known/oauth-protected-resource/mcp` → Cognito AS metadata →
   `POST /register` (DCR) or the pre-registered Claude client.
3. Complete authorize + PKCE; then `initialize`.

## Claude Code

Prefer OAuth (`claude mcp add` with the HTTP URL and OAuth flow). Do not rely on
a long-lived static Bearer header against this server.

## Troubleshooting

| Symptom | Cause |
| ------- | ----- |
| `401` + `WWW-Authenticate: Bearer` | Missing/expired/invalid access token — re-run OAuth or client_credentials. |
| `401` with `error="invalid_token"` | Bearer present but JWT verify failed (wrong pool, scope, or signature). |
| Discovery `401` on `/.well-known/*` | Bug — those routes must be public (ADR 0006). |
| `403 {"error":"forbidden"}` | Bypassed CloudFront (direct Function URL) or bad Origin. |
| `429 {"error":"rate_limited"}` | Per-IP or per-client limit — wait and retry. |
| `503 {"error":"service_unavailable"}` | `MCP_ENABLED=false` kill switch. |
| Hosted UI has no user | Create a Cognito user in the candidate-mcp agent pool. |
