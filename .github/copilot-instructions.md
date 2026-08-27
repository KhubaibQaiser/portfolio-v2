# Copilot instructions — portfolio-v2

This is a Turborepo (pnpm) with `apps/web`, `apps/admin`, `apps/candidate-mcp`,
and packages `shared`, `data`, `ai`, `infra`, `ui`, `agent-mcp`.

## Must

- Admin mutations call `requireAdmin()` (`apps/admin/src/lib/auth-guard.ts`).
  The static check is `apps/admin/src/lib/authorization-guardrail.test.ts`.
- Resume AI: Zod `.strict()` schemas, then `enforceResumeGenerationPolicy` and
  `validateFabrication`. Spec: `specs/resume-ai.md`.
- Untrusted job-description text: `stripPromptInjection` then `wrapUntrusted`.
- Apps depend on ports in `packages/shared`, not AWS SDKs.
- Infra: ADR 0001 (no CFN exports for data/auth), ADR 0002 (one AppErrors
  alarm, not per-table alarms), ADR 0003/0005 (candidate-mcp: API keys +
  CloudFront origin-verify, not Function URL OAC).
- `apps/candidate-mcp` tools stay read-only and sanitized (`deepSanitize`);
  any write-capable tool needs a new ADR. See ADR 0003.

## Must not

- Put secrets in code or logs.
- Call live LLM APIs from unit/eval tests.
- Relax Lighthouse thresholds to unblock CI.
- Add packages for one-off helpers.
- Widen `apps/candidate-mcp`'s DynamoDB IAM grant beyond its five content
  tables, or add a caller-supplied-URL fetch tool (SSRF surface).

Verify with `pnpm lint && pnpm typecheck && pnpm test && pnpm eval:resume`.
