# ADR 0005 — Candidate MCP API keys (supersedes Cognito M2M)

- **Status:** Accepted
- **Date:** 2026-08-27
- **Deciders:** Khubaib (with AI pairing)
- **Supersedes:** [ADR 0003 §1](0003-candidate-mcp-server.md) (Cognito client-credentials identity)

## Context

ADR 0003 chose Cognito client-credentials for machine-to-machine callers (n8n).
Claude.ai custom connectors do not support that grant; they need either OAuth
authorization-code + PKCE (with human consent) or a static `Authorization`
header. The profile data is already public on the site — the MCP server's job
is to expose structured, sanitized, live Dynamo reads to named automation
consumers, not to hide content.

We also need **per-client isolation**: when one consumer (Claude, n8n, a
scraper) misbehaves, throttle or revoke that identity without taking down the
whole server (`MCP_ENABLED` remains a disaster-only kill switch).

## Decision

Replace Cognito on `apps/candidate-mcp` with **hashed API keys** minted in the
admin CMS (`requireAdmin()` + Google allowlist):

1. **Token format:** `mcp_ck_<keyId>_<secret>` where `keyId` is a ULID and
   `secret` is 32 random bytes (base64url). Dynamo stores SHA-256 of the full
   token, display `prefix`, name, per-key rate limits, optional `expires_at`.
   Plaintext is shown **once** at create.
2. **Verification:** `GetItem` by `keyId` only (no Scan from the public
   Lambda). Missing/malformed tokens run a dummy hash compare (timing-safe).
   Revoked = delete row; expired = 401.
3. **Consumers:** Claude.ai (request header), n8n (same header), CI smoke test
   (Secrets Manager generated key, not admin). Local stdio stays unauthenticated
   against fixtures.
4. **Rate limits:** Per-key limits from the key record on tool calls; per-IP
   HTTP limit before auth (Dynamo `rate-limit` table). Invalid keys still
   consume the IP bucket.
5. **No OAuth discovery:** Do not advertise RFC 9728 / Cognito metadata — Claude
   must use Authentication → None + `Authorization: Bearer mcp_ck_…`.
6. **Network:** Origin-verify, read-only tools, `deepSanitize`, five-table IAM
   unchanged from ADR 0003. Add **GetItem only** on `mcp-api-key` table for the
   MCP Lambda. Admin uses wildcard `${tablePrefix}-*` for CRUD on keys.
7. **Cognito teardown:** Remove User Pool, hosted domain, n8n client secret,
   `RestoreWwwAuthenticate` CloudFront Function (OAuth-only).
8. **WAF:** Deferred — in-Lambda IP limits do not stop invoke cost; CloudFront
   WAF rate-based rules are a follow-up.

## Security properties

- Keys never in git, CfnOutputs, Lambda env (except smoke secret ARN pattern),
  or logs/audit bodies.
- MCP Lambda cannot write to the keys table (`UpdateItem` denied) — no
  `last_used_at` from the internet-facing path.
- Admin caps `rate_limit_max` (1–120) to prevent misconfiguration.
- Fail closed on Dynamo errors during verify (503).
- **Origin allowlist (global):** Host header stays pinned to the public MCP
  hostname. Browser `Origin` also allows `claude.ai` and `api.anthropic.com`
  so Claude.ai connectors are not rejected with 403 (missing Origin still
  passes for n8n/curl/smoke).

## Consequences

- **Positive:** Claude.ai and n8n share one auth model; per-client revoke and
  throttle; simpler infra (no Cognito cost/ops); admin self-service key minting.
- **Negative:** Long-lived bearer tokens (mitigated by hash-at-rest, revoke,
  per-key limits); keys in Claude connector store are org-shared credentials;
  deploy deletes Cognito — n8n must be re-keyed manually after cutover.
- **Follow-up:** CloudFront WAF; optional `last_used_at` via admin-only writes;
  write-capable tools still need their own ADR.
