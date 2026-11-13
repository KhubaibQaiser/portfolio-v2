# ADR 0009 — Project write MCP: draft-only proposals, Admin approval

- **Status:** Accepted (2026-11-06)
- **Date:** 2026-11-06
- **Deciders:** Khubaib (with AI pairing)
- **Spec:** [`specs/project-write-mcp.md`](../../specs/project-write-mcp.md)

## Context

ADR 0003 keeps `apps/candidate-mcp` read-only and says any write-capable tool
needs its own ADR and a human-review gate. The owner wants to add portfolio
projects from Claude (Claude.ai / Claude Code now, other agents later)
without opening Admin to type the fields.

## Decision

1. **New deployable**, working name `apps/project-mcp`, own CDK stack and own
   Cognito pool/app clients (scope `projects.write`). `candidate-mcp`, its
   scope, and `grantCandidateMcpDataAccess` are not changed.
2. **One tool, `propose_project`.** It validates against `projectSchema`,
   rejects duplicate slugs, and always saves `status: "draft"`. No update,
   delete, publish, or feature tool. `sort_order`, `is_featured`, and
   `show_in_resume` are set by the server.
3. **Human-review gate = Admin approval.** Drafts are excluded from every
   public read in the `ContentRepository` port (`getProjects`,
   `getFeaturedProjects`, `getProjectBySlug`). Only the `approveProject`
   server action, behind `requireAdmin()`, sets `status: "published"`.
4. **Fail-closed filtering at the port.** Public consumers (web pages, chat,
   resume data, `candidate-mcp`) already call those methods, so they never see
   drafts without per-caller changes. Admin uses `getAllProjects()`.
5. **Freshness uses ADR 0008's on-demand purge.** `approveProject` calls
   `publishContentChanged()` after the status flip, so an approved project
   appears without waiting for the page TTL. `propose_project` only writes a
   hidden draft and publishes nothing.
6. **Network and identity** follow ADR 0003/0006 (OAuth 2.1, origin-verify,
   Host/Origin allowlists, rate limit per `client_id`, `deepSanitize`).
   The Lambda's DynamoDB grant is `PutItem` on the project table and its
   slug-check read, nothing else. Tables are referenced by ARN pattern (ADR 0001).
7. **No SSRF.** `cover_url` must match the media allowlist; the server never
   fetches a caller-supplied URL.

## Consequences

- Positive: agent output never reaches the public site without a human click;
  existing readers are protected by the port change.
- Negative: a second Cognito pool and Lambda to operate; one extra step (Approve)
  per project; `projectSchema` gains `status` (default `published`, so existing
  rows are unaffected).
- Out of scope: tag-based invalidation, edits from MCP, media upload.
