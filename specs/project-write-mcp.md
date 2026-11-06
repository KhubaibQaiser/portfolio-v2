# Project write MCP — acceptance spec

Contract for letting an MCP client (Claude.ai / Claude Code now, other agents
later) **propose a new portfolio project** that the owner approves in Admin.
Status: **built, not deployed.** [ADR 0008](../docs/adr/0008-project-write-mcp.md)
is Accepted. Implemented: schema `status`, draft filtering, the Admin Approve
action, `apps/project-mcp`, and `ProjectMcpStack` (synth-tested). Per AGENTS.md
invariant 7 and ADR 0003, a write-capable MCP tool needs its own ADR and a
human-review gate; this is that gate.

Freshness model: **unchanged time-based ISR** (`export const revalidate = 10`
on public pages). No tags, no revalidate endpoint, no tag-cache changes. An
approved project appears on the site within ~10 s plus CDN
stale-while-revalidate (`expireTime: 60`).

## Decisions

| Topic         | Decision                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| Location      | New app + CDK stack (working name `apps/project-mcp`). `apps/candidate-mcp` stays read-only; do not touch its IAM. |
| Review gate   | Tool creates a **draft**. Only an Admin action publishes it.                                                        |
| Auth          | OAuth 2.1 + Cognito as in ADR 0006, new scope `projects.write`, separate user pool/clients from candidate-mcp.     |
| Callers       | Interactive (auth code + PKCE) first; M2M allowed later by adding an app client, no code change.                   |
| Invalidation  | None. ISR timer only.                                                                                               |

## Schema change (packages/shared)

- Add `status: z.enum(["draft", "published"]).default("published")` to
  `projectSchema` (`packages/shared/src/schemas/project.ts`). Default keeps
  existing rows and the Admin form published.
- Public reads must exclude drafts: `getProjects`, `getFeaturedProjects`,
  `getProjectBySlug` in both adapters (`packages/data`), plus resume paths via
  `filterProjectsForResume`. Admin list reads include drafts.
- Add a port method for admin listing with drafts (e.g. `getAllProjects`) rather
  than changing the public method's meaning silently.

## Tool: `propose_project`

- Input: `projectSchema` minus `status`, `sort_order`, `is_featured`,
  `show_in_resume` (server sets `draft`, end of list, `false`, `false`).
- Validates with `projectSchema.safeParse`; slug must be unique
  (`getProjectBySlug` returns null) or the call fails with a clear error.
- `cover_url` must be on the media allowlist
  (`mediaRemotePatterns`, `packages/deploy`). The server **never fetches** any
  caller-supplied URL (ADR 0003 SSRF rule).
- Free-text inputs pass the prompt-injection scrub; outputs pass `deepSanitize`.
- Writes via `ContentRepository.insertProject` only. Returns `{ id, slug,
  status: "draft", reviewUrl }`. No update, delete, publish, or feature tool.
- Rate limited per `client_id` (same pattern as candidate-mcp), audit-logged
  without PII.

## Admin approval

- Projects list shows a Draft badge and an **Approve** action.
- Approve is a server action that calls `requireAdmin()` (invariant 1; covered
  by `authorization-guardrail.test.ts`), then sets `status: "published"` with
  the revision check used by `saveProject`.
- Editing/saving a draft in Admin keeps it a draft until Approve.

## IAM / infra

- Dynamo write grant (`PutItem` on the `project` table + its GSIs only; read for
  the slug check) for the new Lambda. No other tables, no S3, no secrets beyond
  its own.
- Reference tables by ARN pattern/SSM, no `Fn::ImportValue` (ADR 0001).
- Same network posture as ADR 0003/0006: origin-verify, Host/Origin allowlists,
  no reserved concurrency.

## Must

- A draft never appears on `/`, `/projects`, `/projects/[slug]`, `llms*.txt`,
  sitemap, OG routes, resume, or the candidate-mcp read tools.
- Tool cannot publish; only `requireAdmin()` code can.
- Invalid or duplicate-slug input writes nothing.

## Tests (CI)

- Schema: `status` default; drafts filtered in fixture and Dynamo adapters.
- Tool: valid draft created; duplicate slug, bad URL host, extra fields rejected;
  sanitize applied; unauthenticated/under-scoped token rejected.
- Admin: approve requires `requireAdmin()`; guardrail test passes.
- CDK: write grant limited to the project table; no wildcard; no exports.

## Out of scope

Tag-based invalidation, update/delete tools, media upload, auto-publish,
featuring from MCP.
