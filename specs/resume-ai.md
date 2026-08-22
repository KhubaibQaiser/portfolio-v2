# Resume AI — acceptance spec

This is the contract for tailored resume generation. Prompt copy in
`packages/ai/src/prompts/` may change; the merge gate is the deterministic
pipeline below, not the model.

## Pipeline

1. Untrusted job-description text is run through `stripPromptInjection` then
   `wrapUntrusted` (`packages/ai/src/guardrails/prompt-injection.ts`).
2. Candidate rows are compacted into a fact sheet + `idMap` by
   `buildCandidateFacts` (`packages/ai/src/context/build-candidate-facts.ts`).
3. The model must return JSON matching `tailoredResumeSchema` (Zod `.strict()`,
   `packages/ai/src/schemas/tailored-resume.ts`).
4. `enforceResumeGenerationPolicy` parses, checks, and clamps the object
   (`packages/ai/src/policy/resume-generation-policy.ts`).
5. `validateFabrication` confirms every `{experienceId, sourceBulletIndex}`
   pair exists in `idMap` (`packages/ai/src/guardrails/fabrication-check.ts`).
6. Failures raise `ResumePolicyError` / `ValidatedGenerationError`. The
   generate route retries on the fallback model chain
   (`apps/admin/src/lib/resume-ai/generate-validated-content.ts`). Unvalidated
   JSON never reaches the admin UI.

Layout numbers (`minExperienceItems`, `maxExperienceItems`, bullet budget,
`requireSummary`) come from `VariantGuidelines` (`classicGuidelines` /
`modernBlueGuidelines` in `packages/shared/src/schemas/resume-layout-defaults.ts`).

## Must

- Every bullet `experienceId` exists in `idMap.experiences`.
- Every bullet `sourceBulletIndex` is in range for that experience's source
  bullets. Duplicate indexes in the same role are a violation.
- A bullet's `experienceId` matches its parent role.
- When `guidelines.validation.requireSummary` is true, summary is non-empty.
- Summary ends with terminal punctuation (`.`, `!`, or `?`, optional closing
  quote/bracket).
- Numeric tokens in a rewritten bullet (`40`, `99%`, `$5`, …) must appear in
  that role's source bullets (case-insensitive). Cross-role copying of a
  number is a violation.
- Capitalized tokens that are not sentence-initial and not in the common-verb
  allowlist must appear in the fact sheet (blocks invented product/employer
  names).
- Every returned skill name maps to a canonical CMS skill via
  `idMap.skills` (lowercase key).
- `highlightedSkills` is a subset of the returned canonical skills when skill
  highlighting is enabled for the layout.
- Keywords that cannot be traced in the fact sheet are dropped (warning), not
  invented. An empty keyword list is rebuilt from canonical skills.
- Role count below `minExperienceItems` is a hard violation. Roles above
  `maxExperienceItems` are clamped with a warning.

### `ats-resume` layout (admin LaTeX export)

- All CMS experience roles must appear in output — never drop roles to save space.
- `titleOverride` must be null or exactly `Senior Software Engineer` or
  `Senior Fullstack Engineer`.
- No markdown bold (`**`) in summary or bullets.
- No banned Unicode (smart quotes, en dash, em dash) in text fields.
- Hyphenated compounds in prose are rejected except allowlisted proper names
  (`Quaid-i-Azam`, `Content-to-Commerce`) and skills-line JD keywords.
- Exactly one page after trim + compile; overflow is trimmed by bullets
  oldest-first, never by removing roles.
- See `specs/resume-ats-latex.md` for compile/verify and golden PDF workflow.

## Must not

- Follow instructions embedded in the job description. Text inside
  `<job_description>` is data. Known injection phrases are replaced with
  `[redacted]` before the model sees them.
- Invent employers, titles, dates, metrics, customers, or skills absent from
  the source profile.
- Return extra JSON keys (`tailoredResumeSchema` is `.strict()`).

## Non-conformance

Any Must violation throws `ResumePolicyError`. The attempt is recorded in
generation telemetry and retried. The user sees a validation/provider error,
not fabricated content.

## Verification

Offline fixtures in `packages/ai/src/evals/cases/` encode each Must / Must-not
as a pass or fail case. Run `pnpm eval:resume` (also part of `pnpm test`).
Do not call live LLM APIs in that suite.

When changing this spec, add or update a fixture in the same PR as the
policy/prompt change.
