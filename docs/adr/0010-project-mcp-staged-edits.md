# ADR 0010 — Project MCP: read tools and staged edits (no delete)

- **Status:** Proposed
- **Date:** 2026-11-13
- **Deciders:** Khubaib (with AI pairing)
- **Amends:** [ADR 0009](0009-project-write-mcp.md) (which allowed one tool, `propose_project`)
- **Spec:** [`specs/project-mcp-edit.md`](../../specs/project-mcp-edit.md)

## Context

ADR 0009 lets an agent add projects as hidden drafts. The owner also wants the
agent to modify existing projects, but not delete them. A modification to a
published project is public content written by an agent, so the human-review
gate from ADR 0003/0009 must still apply.

## Decision

1. **Three new tools** on `apps/project-mcp`, in addition to `propose_project`:
   `list_projects` and `get_project` (read-only), and `propose_project_update`.
   There is still **no delete, publish, feature, reorder or resume tool**.
2. **Staged revisions.** An update to a **published** project is stored on the
   same row as `pending_revision`; the live fields are untouched and the public
   site keeps serving the old version until an Admin approves. An update to a
   **draft** applies directly (it is already hidden). Only the Admin server
   actions `approveProjectRevision` and `rejectProjectRevision`, behind
   `requireAdmin()`, apply or clear a pending revision.
3. **Fail-closed reads.** Public `ContentRepository` methods strip
   `pending_revision`, so no public consumer (web, chat, resume data,
   candidate-mcp) can see staged text. Admin and project-mcp read it via
   `getAllProjects()` / `getProjectById()`.
4. **Identity and concurrency.** `slug` is immutable and is the lookup key.
   `propose_project_update` requires `base_revision`; a mismatch returns a
   conflict, so the agent cannot overwrite a newer Admin edit. A second pending
   revision for the same project replaces the first (last proposal wins; Admin
   sees only the latest).
5. **Caller-owned fields** are the content fields only (title, summary,
   description, role, type, tech_tags, links, cover_url, and later client and
   cover_alt). `status`, `sort_order`, `is_featured`, `show_in_resume`, `slug`
   and the gallery stay server-owned or Admin-only; the input is `.strict()`.
   `cover_url` keeps the media-host rule (no SSRF).
6. **IAM does not widen.** The Lambda already has Get/Query/Scan/PutItem on the
   project table; the conditional write reuses `PutItem`. No `DeleteItem`, and
   no other table.
7. **Read output is sanitised** with `deepSanitize` (same as candidate-mcp), and
   freshness follows ADR 0008: approving a revision calls
   `publishContentChanged()`; staging one publishes nothing.

## Consequences

- Positive: an agent can fix or extend existing projects while every public
  change still needs a human click; no new AWS resources or permissions.
- Negative: a larger tool surface to keep read-only/sanitised; Admin needs a
  diff-and-approve UI; one more field on the project row.
- Out of scope: delete, publish, slug rename, bulk edits, media upload.
