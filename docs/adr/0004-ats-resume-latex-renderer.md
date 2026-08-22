# ADR 0004: ATS resume LaTeX renderer

## Status

Accepted

## Context

Admin Resume AI needs a job-tailored PDF that matches a fixed Carlito-based
LaTeX template with strict ATS text rules. React-PDF cannot reproduce Carlito
metrics, `enumitem` hanging bullets, and hand-tuned `\vspace` reliably.

The public portfolio PDF download must stay on React-PDF (`classic` default).

## Decision

1. Add `component_key: "ats-resume"` for admin-only tailoring.
2. Introduce `@portfolio/resume-latex` — template asset, body builder, XeLaTeX
   runner, trim, verify.
3. Introduce `ResumePdfRenderer` port + registry; `process-render-job` resolves
   renderer by `component_key` (Open/Closed).
4. LLM still returns `tailoredResumeSchema` JSON; LaTeX is never model output.
5. Render worker uses a Lambda **container image** with TeX Live + Carlito.

## Consequences

- Second render engine in the monorepo, bounded to `packages/resume-latex`.
- Larger render worker image and cold starts; isolated to render queue only.
- Visual regression depends on golden PDF + PNG fixtures and optional CI TeX.
- `layout-registry.tsx` remains React-PDF only; web `/api/pdf` unchanged.

## Alternatives considered

- React-PDF replica of the LaTeX template — rejected (pixel fidelity).
- Synchronous LaTeX in Next.js routes — rejected (latency, sandbox, ops).
