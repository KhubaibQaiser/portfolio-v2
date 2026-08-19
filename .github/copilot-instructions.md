# Copilot instructions — portfolio-v2

This is a Turborepo (pnpm) with `apps/web`, `apps/admin`, and packages
`shared`, `data`, `ai`, `infra`, `ui`, `agent-mcp`.

## Must

- Admin mutations call `requireAdmin()` (`apps/admin/src/lib/auth-guard.ts`).
  The static check is `apps/admin/src/lib/authorization-guardrail.test.ts`.
- Resume AI: Zod `.strict()` schemas, then `enforceResumeGenerationPolicy` and
  `validateFabrication`. Spec: `specs/resume-ai.md`.
- Untrusted job-description text: `stripPromptInjection` then `wrapUntrusted`.
- Apps depend on ports in `packages/shared`, not AWS SDKs.
- Infra: ADR 0001 (no CFN exports for data/auth) and ADR 0002 (one AppErrors
  alarm, not per-table alarms).

## Must not

- Put secrets in code or logs.
- Call live LLM APIs from unit/eval tests.
- Relax Lighthouse thresholds to unblock CI.
- Add packages for one-off helpers.

Verify with `pnpm lint && pnpm typecheck && pnpm test && pnpm eval:resume`.
