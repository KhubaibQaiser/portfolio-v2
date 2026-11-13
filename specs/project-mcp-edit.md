# Project MCP — read tools and staged edits

Status: **Draft — no implementation until reviewed.** Decisions are the owner's
answers (2026-11-13); ADR [0010](../docs/adr/0010-project-mcp-staged-edits.md)
records them and must be Accepted before code. Builds on PR 108 (ADR 0009).

## Goal

Let Claude add (already built) and **modify** projects through the MCP
connector, without delete and without any public change that skips a human.

## Tools

| Tool                     | Kind  | Behavior                                                                                                                                                                       |
| ------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `propose_project`        | write | Unchanged: new hidden draft.                                                                                                                                                   |
| `list_projects`          | read  | `{ slug, title, summary, status, revision, has_pending }[]`, drafts included, `deepSanitize`d.                                                                                 |
| `get_project`            | read  | By `slug`: all caller-visible fields, `status`, `revision`, and `pending_revision` if any.                                                                                     |
| `propose_project_update` | write | Input: `slug`, `base_revision`, and at least one content field (strict, partial). Draft → applied now. Published → saved as `pending_revision`. Returns `{ ok, mode: "applied" | "staged", revision, reviewUrl }`or`{ ok:false, error }`. |

No delete, publish, feature, reorder or resume tools. Annotations: reads
`readOnlyHint: true`; `propose_project_update` `readOnlyHint:false`,
`destructiveHint:false`, `idempotentHint:true`.

## Data

`projectRowSchema` gains optional `pending_revision`:
`{ values: Partial<content fields>, base_revision: number, proposed_at: string, proposed_by: string }`
(`proposed_by` = OAuth `client_id`). Absent on existing rows. The port strips it
from every public method (`getProjects`, `getFeaturedProjects`,
`getProjectBySlug`); `getAllProjects` / `getProjectById` keep it for Admin and
the MCP.

## Rules

1. Look up by slug via `getAllProjects()`; unknown slug → error.
2. `base_revision` must equal the row's `revision`, else `{ ok:false, error:"revision conflict" }`. The write uses the existing conditional update (`expectedRevision`), so concurrent edits cannot both win.
3. Draft: merge values, bump revision. Published: write only `pending_revision` (and bump `revision`, so a later Admin edit invalidates the proposal's `base_revision`).
4. `cover_url` must be null or on the media host. Inputs and outputs pass `deepSanitize`.
5. Empty update (no fields) is rejected.

## Admin

- Projects list shows a "Pending changes" badge.
- A review dialog lists each changed field as before/after; **Approve** applies `values` to the live row, clears `pending_revision`, calls `publishContentChanged()`; **Reject** clears it.
- Both actions call `requireAdmin()`; extend `authorization-guardrail.test.ts`, do not weaken it.
- If the live row's `revision` moved after the proposal, Approve warns that fields changed since and still shows the current values in the diff.

## Infra

None. The Lambda already has `GetItem/Query/Scan/PutItem` on the project table
(`grantProjectMcpDataAccess`); the conditional write is a `PutItem`. Add a stack
test asserting there is still no `DeleteItem` and no other table.

## Acceptance

- [ ] Unit: `propose_project_update` on a draft applies; on a published row stages and leaves live fields identical; stale `base_revision` conflicts; unknown slug errors; `status`/`sort_order`/`slug`/`is_featured` rejected by the strict schema; off-host `cover_url` rejected.
- [ ] Unit: public repository methods never return `pending_revision` (fixture and DynamoDB adapters); concurrent updates with the same `base_revision` → exactly one succeeds (DynamoDB Local test).
- [ ] Unit: `list_projects`/`get_project` output is sanitised and includes drafts.
- [ ] Admin: approve applies and clears and publishes `ContentChanged`; reject clears; both require admin; guardrail test passes.
- [ ] CDK: no `DeleteItem`, project table only (plus rate-limit counter).
- [ ] Protocol-era and OAuth connector integration tests list all four tools.
- [ ] After deploy: stage an edit to a published project through the connector, confirm the live page is unchanged, approve it in Admin, confirm the page updates.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm eval:resume`.

## Risks

- A staged proposal sitting for weeks goes stale; the `base_revision` check surfaces that at approve time.
- The agent can read draft text it or another client wrote; it is sanitised, and drafts are not secret.
- Last-proposal-wins can discard an earlier unapproved proposal; acceptable, and Admin sees only the latest.
