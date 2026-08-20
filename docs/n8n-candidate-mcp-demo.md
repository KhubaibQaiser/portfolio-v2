# n8n demo: calling the candidate-mcp server

This is the Phase 1 demo referenced in [ADR 0003](adr/0003-candidate-mcp-server.md):
an n8n workflow that authenticates as the `n8n-workflow` Cognito app client,
calls both tools on the deployed `candidate-mcp` server, and shows the result.
It is deliberately just a read → display flow — the job-matching, resume
generation, and one-click-apply pieces are Phase 2+ and are out of scope here.

n8n does not (yet) ship a native MCP-client node, so this workflow speaks the
MCP Streamable HTTP transport directly over n8n's built-in **HTTP Request**
node, which is also the most transparent way to demo the protocol itself.

## Prerequisites

- `Portfolio-CandidateMcp` deployed (`domainEnabled=true`; see the root
  [README](../README.md#deploying-to-aws)).
- The n8n client's Cognito credentials, read once from Secrets Manager:

  ```bash
  aws secretsmanager get-secret-value \
    --region eu-west-1 \
    --secret-id /portfolio/candidate-mcp/n8n-workflow-client \
    --query SecretString --output text | jq
  ```

  This returns `{ clientId, clientSecret, tokenEndpoint, scope }` — the exact
  shape `CandidateMcpStack` writes (see `candidate-mcp-stack.ts`). Paste these
  into n8n credentials, never into the workflow JSON itself.

## Workflow shape

```mermaid
flowchart LR
  trigger[Manual Trigger] --> token[HTTP Request: get OAuth token]
  token --> init[HTTP Request: MCP initialize]
  init --> call[HTTP Request: tools/call get_candidate_profile]
  call --> set[Edit Fields: extract profile JSON]
```

### 1. `Get OAuth token` (HTTP Request node)

Client-credentials grant against the Cognito hosted-UI token endpoint —
standard OAuth 2.1 M2M, nothing MCP-specific yet.

- **Method:** `POST`
- **URL:** `{{ $credentials.candidateMcp.tokenEndpoint }}`
- **Authentication:** none (credentials go in the body per RFC 6749 §4.4,
  not Basic auth, to keep this portable across IdPs)
- **Body type:** Form-urlencoded
  - `grant_type` = `client_credentials`
  - `client_id` = `{{ $credentials.candidateMcp.clientId }}`
  - `client_secret` = `{{ $credentials.candidateMcp.clientSecret }}`
  - `scope` = `{{ $credentials.candidateMcp.scope }}`

Output: `{ access_token, expires_in, token_type }`. The token is a 1-hour JWT
(see `accessTokenValidity` in `candidate-mcp-stack.ts`) — re-run this node
rather than caching the token across demo sessions.

### 2. `MCP initialize` (HTTP Request node)

The MCP Streamable HTTP transport requires an `initialize` handshake before
any tool call on a fresh session.

- **Method:** `POST`
- **URL:** `https://mcp.khubaibqaiser.com/mcp`
- **Headers:**
  - `Content-Type: application/json`
  - `Accept: application/json, text/event-stream`
  - `Authorization: Bearer {{ $node["Get OAuth token"].json.access_token }}`
- **Body (JSON):**

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

- **Response:** capture the `Mcp-Session-Id` response header — pass it as a
  header on every subsequent call in this session.

### 3. `Call get_candidate_profile` (HTTP Request node)

- Same URL/headers as step 2, plus `Mcp-Session-Id: {{ $node["MCP initialize"].json.headers["mcp-session-id"] }}`.
- **Body (JSON):**

  ```json
  {
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": { "name": "get_candidate_profile", "arguments": {} }
  }
  ```

  Swap `"name"` for `"get_candidate_facts"` to fetch the compact, LLM-ready
  fact sheet instead (the same context object the resume-AI pipeline uses —
  see `packages/ai/src/context/build-candidate-facts.ts`). Both tools take no
  arguments; every field returned has already passed the server's
  prompt-injection scrub (`apps/candidate-mcp/src/sanitize.ts`), so it is
  safe to feed directly into a downstream LLM node.

### 4. `Extract profile JSON` (Edit Fields / Set node)

`{{ JSON.parse($json.result.content[0].text) }}` — the tool result's
`content[0].text` is a JSON string (see `get-candidate-profile.ts`), so it
needs one `JSON.parse` before n8n's expression editor can address individual
fields (e.g. `.about.summary`, `.experience[0].company`).

## What this demo does not do yet

Per ADR 0003's standing invariants, none of the following exist and none
should be added without a new ADR + human-review gate: job-board scraping,
job/profile matching or rating, resume/cover-letter generation from this
workflow, or any "apply" action. This workflow only proves the authenticated
read path an eventual Phase 2 pipeline would build on.

## Troubleshooting

| Symptom                                     | Cause                                                                                                                                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `401` with a `WWW-Authenticate` header      | Missing/expired bearer token — re-run the token node (tokens expire after 1 hour).                                                                                                               |
| `403 {"error":"forbidden"}`                 | Request did not present CloudFront's origin-verify header (direct Function URL, or a proxy that stripped headers). Call `https://mcp.khubaibqaiser.com/mcp`, not the `*.lambda-url.*` origin.     |
| `503 {"error":"service_unavailable"}`       | The Lambda's `MCP_ENABLED` kill switch was flipped to `"false"` directly on the function (see `loadConfig` in `apps/candidate-mcp/src/config.ts`) — redeploy or update the env var to re-enable. |
| `429`                                       | Per-`client_id` rate limit exceeded (`MCP_RATE_LIMIT_MAX`, default 30/min) — wait for the window to roll over.                                                                                   |
