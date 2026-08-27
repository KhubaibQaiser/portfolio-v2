# n8n demo: calling the candidate-mcp server

This is the Phase 1 demo referenced in [ADR 0003](adr/0003-candidate-mcp-server.md)
and [ADR 0005](adr/0005-candidate-mcp-api-keys.md): an n8n workflow that calls
both tools on the deployed `candidate-mcp` server with an API key minted in
admin. It is deliberately just a read → display flow — job-matching, resume
generation, and one-click-apply are Phase 2+ and out of scope here.

n8n does not (yet) ship a native MCP-client node, so this workflow speaks the
MCP Streamable HTTP transport directly over n8n's built-in **HTTP Request**
node.

## Prerequisites

- `Portfolio-CandidateMcp` deployed (`domainEnabled=true`; see the root
  [README](../README.md#deploying-to-aws)).
- An API key created in **Admin → MCP API keys** (e.g. name `n8n-workflow`).
  Copy the bearer token when shown — it is not retrievable later.

## Workflow shape

```mermaid
flowchart LR
  trigger[Manual Trigger] --> init[HTTP Request: MCP initialize]
  init --> call[HTTP Request: tools/call get_candidate_profile]
  call --> set[Edit Fields: extract profile JSON]
```

### 1. `MCP initialize` (HTTP Request node)

- **Method:** `POST`
- **URL:** `https://mcp.khubaibqaiser.com/mcp`
- **Headers:**
  - `Content-Type: application/json`
  - `Accept: application/json, text/event-stream`
  - `Authorization: Bearer mcp_ck_…` (paste the full key from admin)
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

- **Response:** capture the `Mcp-Session-Id` response header for subsequent calls.

### 2. `Call get_candidate_profile` (HTTP Request node)

- Same URL and `Authorization` header as step 1, plus
  `Mcp-Session-Id: {{ $node["MCP initialize"].json.headers["mcp-session-id"] }}`.
- **Body (JSON):**

  ```json
  {
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": { "name": "get_candidate_profile", "arguments": {} }
  }
  ```

  Swap `"name"` for `"get_candidate_facts"` for the compact LLM-ready fact sheet.

### 3. `Extract profile JSON` (Edit Fields / Set node)

`{{ JSON.parse($json.result.content[0].text) }}` — the tool result's
`content[0].text` is a JSON string, so it needs one `JSON.parse` before n8n
can address individual fields.

## Claude.ai connector (same key)

1. Admin → MCP API keys → create `claude-ai`.
2. Customize → Connectors → `https://mcp.khubaibqaiser.com/mcp`.
3. **Authentication → None** (do not use Detected OAuth).
4. **Additional request headers:** `Authorization` = `Bearer mcp_ck_…` (include
   `Bearer ` and the space).
5. Enable the connector in chat; call `get_candidate_facts` before tailoring a JD.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `401 {"error":"unauthorized"}` | Missing/wrong/expired/revoked API key. |
| `403 {"error":"forbidden"}` | Request bypassed CloudFront (direct Function URL). |
| `429 {"error":"rate_limited"}` | Per-key or per-IP limit — wait or raise the key's limit in admin. |
| `503 {"error":"service_unavailable"}` | `MCP_ENABLED=false` kill switch on the Lambda. |
