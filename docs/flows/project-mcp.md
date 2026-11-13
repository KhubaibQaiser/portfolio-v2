# Flow — project write MCP (drafts and staged edits)

Network MCP on `mcp-write.<domain>` (ADR [0009](../adr/0009-project-write-mcp.md)).
Separate Cognito pool and scope (`projects.write`) from candidate-mcp.
`propose_project` creates a **draft**. `list_projects` / `get_project` read.
`propose_project_update` edits a draft directly, or **stages** an edit to a
published project as `pending_revision` (ADR [0010](../adr/0010-project-mcp-staged-edits.md));
an admin approves or rejects it. There is no delete or publish tool.

```mermaid
flowchart TD
  client[Claude.ai / Claude Code]
  cf[CloudFront mcp-write.domain]
  fn[Project-mcp ServerFn]
  tool[propose_project / propose_project_update]
  ddb[(Dynamo project table)]
  admin[Admin /projects: Approve, Review changes]
  web[Public site (purged on approve)]

  client --> cf --> fn --> tool --> ddb
  ddb -->|status draft: hidden| web
  admin -->|requireAdmin, status published| ddb
  ddb -->|published| web
```

## Modules

| Step                  | File                                                              |
| --------------------- | ----------------------------------------------------------------- |
| Stack                 | `packages/infra/src/stacks/project-mcp-stack.ts`                  |
| IAM (PutItem project) | `grantProjectMcpDataAccess` in `packages/infra/src/naming.ts`     |
| Handler               | `apps/project-mcp/src/lambda.ts`                                  |
| Tools                 | `tools/propose-project.ts`, `tools/project-edit.ts` (project-mcp) |
| Draft filtering       | `ContentRepository` adapters in `packages/data`                   |
| Approve draft         | `approveProject` in `apps/admin/src/lib/actions.ts`               |
| Approve/reject edit   | `approveProjectRevision` / `rejectProjectRevision` (same file)    |

## Debug

1. Draft or staged text visible on the public site: a reader bypassed `getProjects` / `getProjectBySlug` / `getFeaturedProjects`, which strip `pending_revision`.
2. `cover_url` rejected: it must be on the `MEDIA_PUBLIC_BASE_URL` host.
3. Approved project not showing: check that `approveProject` published `ContentChanged` and the purge Lambda ran (ADR 0008).
4. Auth/discovery issues: same ladder as [candidate-mcp](candidate-mcp.md).

Logs: Project-mcp `ServerFn`, `service` = `portfolio-project-mcp`.

Note: `apps/project-mcp` plumbing (OAuth, DCR, origin-verify, rate limits) is a
copy of `apps/candidate-mcp`. Fix security bugs in both until it is extracted
into a shared package.
