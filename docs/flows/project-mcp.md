# Flow — project write MCP (draft proposals)

Network MCP on `mcp-write.<domain>` (ADR [0009](../adr/0009-project-write-mcp.md)).
Separate Cognito pool and scope (`projects.write`) from candidate-mcp. The only
tool, `propose_project`, creates a **draft**; an admin approves it.

```mermaid
flowchart TD
  client[Claude.ai / Claude Code]
  cf[CloudFront mcp-write.domain]
  fn[Project-mcp ServerFn]
  tool[propose_project]
  ddb[(Dynamo project table)]
  admin[Admin /projects: Approve]
  web[Public site (purged on approve)]

  client --> cf --> fn --> tool --> ddb
  ddb -->|status draft: hidden| web
  admin -->|requireAdmin, status published| ddb
  ddb -->|published| web
```

## Modules

| Step                  | File                                                       |
| --------------------- | ---------------------------------------------------------- |
| Stack                 | `packages/infra/src/stacks/project-mcp-stack.ts`           |
| IAM (PutItem project) | `grantProjectMcpDataAccess` in `packages/infra/src/naming.ts` |
| Handler               | `apps/project-mcp/src/lambda.ts`                           |
| Tool                  | `apps/project-mcp/src/tools/propose-project.ts`            |
| Draft filtering       | `ContentRepository` adapters in `packages/data`            |
| Approve               | `approveProject` in `apps/admin/src/lib/actions.ts`        |

## Debug

1. Draft visible on the public site: a reader bypassed `getProjects` / `getProjectBySlug`.
2. `cover_url` rejected: it must be on the `MEDIA_PUBLIC_BASE_URL` host.
3. Approved project not showing: check that `approveProject` published `ContentChanged` and the purge Lambda ran (ADR 0008).
4. Auth/discovery issues: same ladder as [candidate-mcp](candidate-mcp.md).

Logs: Project-mcp `ServerFn`, `service` = `portfolio-project-mcp`.

Note: `apps/project-mcp` plumbing (OAuth, DCR, origin-verify, rate limits) is a
copy of `apps/candidate-mcp`. Fix security bugs in both until it is extracted
into a shared package.
