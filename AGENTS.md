# Agent operating manual

This repository is a Turborepo monorepo. Coding agents must treat the files
below as the source of truth, not guesses from training data.

## What this repo is

- `apps/web` — public Next.js site (chat, resume PDF, contact).
- `apps/admin` — CMS. Better Auth + Google. DynamoDB has no row-level security.
- `apps/candidate-mcp` — network-facing MCP server for external automation
  (hashed API keys, ADR 0005). See ADR 0003/0005 before changing auth, IAM, or
  adding tools.
- `packages/shared` — Zod schemas and ports (`ContentRepository`, `MediaStore`, …).
- `packages/data` — DynamoDB / fixture adapters.
- `packages/ai` — model factory, prompts, schemas, guardrails, resume policy.
- `packages/infra` — AWS CDK. See `docs/adr/` before changing stacks.
- `packages/agent-mcp` — local, unauthenticated, read-only MCP tools that
  return ADRs and AI contracts (dev-only; not the same trust boundary as
  `apps/candidate-mcp`).

## Invariants (already enforced — do not weaken)

1. **Admin mutations must call `requireAdmin()`.** Middleware is UX only.
   CI: `apps/admin/src/lib/authorization-guardrail.test.ts`.
   Implementation: `apps/admin/src/lib/auth-guard.ts`.
2. **Resume AI output must pass `enforceResumeGenerationPolicy` and
   `validateFabrication`.** Never surface unvalidated model JSON to the UI.
   Spec: `specs/resume-ai.md`. Code: `packages/ai/src/policy/` and
   `packages/ai/src/guardrails/`.
3. **No secrets in source.** Use Secrets Manager ARNs. Do not log tokens,
   session cookies, or full PII.
4. **Apps depend on ports, not AWS SDKs.** Put new persistence behind
   `packages/shared/src/ports`.
5. **No cross-stack CloudFormation exports** for data/auth resources (ADR 0001).
   Use ARN patterns or the SSM registry.
6. **Observability stays symptom-based** (ADR 0002). Do not reintroduce
   per-table CloudWatch alarms.
7. **`apps/candidate-mcp` tools must stay read-only and pass through
   `deepSanitize`.** Any write-capable tool (job matches, applications,
   "apply" actions) needs its own ADR and a human-review gate before
   implementation. See ADR 0003 and `apps/candidate-mcp/src/sanitize.ts`.

## How to change things

1. Read the relevant ADR in `docs/adr/` and the Zod schema in
   `packages/shared` or `packages/ai/src/schemas`.
2. For Resume AI, update `specs/resume-ai.md` and add an offline eval case
   under `packages/ai/src/evals/cases/` before changing prompts or policy.
3. Implement the smallest change. Do not add packages unless the task is a
   new bounded concern.
4. Run:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm eval:resume
```

Use `pnpm --filter @portfolio/agent-mcp start` only when exercising the local
dev MCP server. Use `pnpm --filter @portfolio/candidate-mcp dev` for the
network-facing one; its CI gate is the `mcp-security` job (auth, sanitize,
rate-limit tests plus `candidate-mcp-stack.test.ts`'s CDK assertions).

## Do not

- Relax Lighthouse assertions to make CI green.
- Skip `requireAdmin()` on a new mutating server action or API route.
- Call live LLM APIs from unit tests or `pnpm eval:resume` (fixtures only).
- Add CloudFormation `Fn::ImportValue` / construct exports between Data/Auth
  and consumer stacks (ADR 0001).
- Invent employers, metrics, or skills in Resume AI prompts or eval fixtures
  that the policy is meant to reject — fixtures that should fail must be
  marked `expect: "fail"`.
- Widen `apps/candidate-mcp`'s DynamoDB IAM grant
  (`grantCandidateMcpDataAccess`) beyond the five content tables, or add a
  tool that fetches a caller-supplied URL (SSRF surface) — see ADR 0003.
