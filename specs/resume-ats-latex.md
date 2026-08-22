# ATS Resume — LaTeX compile and verify

Contract for the `ats-resume` layout (`component_key: "ats-resume"`). Visual
truth lives in vendored TeX and the golden PDF — not in
`VariantGuidelines.formatting` JSON.

## Assets

| Path | Role |
|------|------|
| `packages/resume-latex/templates/resume_template.tex` | Locked preamble + reference body |
| `packages/resume-latex/fixtures/Khubaib_Qaiser_LaTeX_Template_Reference.pdf` | Golden visual output |
| `packages/resume-latex/fixtures/Khubaib_Qaiser_LaTeX_Template_Reference-page.png` | Raster @ 150 DPI for pixel diff |
| `packages/resume-latex/fixtures/ats-resume-reference.ts` | `ResumeData` mirroring golden content |

## Pipeline (admin only)

1. LLM returns `tailoredResumeSchema` JSON (never raw LaTeX).
2. `enforceResumeGenerationPolicy` + `validateFabrication` (see `specs/resume-ai.md`).
3. `applyTailoredResume` merges into `ResumeData`.
4. `LatexAtsResumeRenderer`: `trimAtsResumeForPage` → `buildResumeBody` →
   `assembleResumeDocument` → `xelatex` ×2 → `verifyResumePdf`.

Public portfolio `/api/pdf` does **not** use this path.

## Compile

- Engine: **XeLaTeX only** (`xelatex resume.tex` twice).
- Font: **Carlito** with `\setmainfont{Carlito}[Mapping=]`.
- Local Debian/Ubuntu: `texlive-xetex`, `fonts-crosextra-carlito`, `poppler-utils`.

## Verify (`verify-resume-pdf.ts`)

Section 7 items enforced in CI/worker when `pdfinfo` / `pdftotext` are available:

1. Exactly one page.
2. No banned Unicode (smart quotes, en/em dashes) in extracted text.
3. No text-month date patterns (`Jan 2024`); numeric `MM/YYYY` only (education year-only exempt).
4. Fail closed on verify errors — job marked `failed`, not degraded PDF.

Item 6 (ATS keyword ≥ 85%) is **not** a compile gate; use the admin ATS panel.

## Visual regression

`packages/resume-latex/src/visual-regression.test.ts`:

1. Compile vendored template unchanged.
2. Compile builder output for `ats-resume-reference.ts` → **0-pixel diff** vs golden PNG at 150 DPI.

Skipped when `xelatex` / `pdftoppm` are not installed.

## Infrastructure

Production render worker: Lambda **container image** with TeX Live
(`packages/infra/docker/render-job-worker/Dockerfile`). Classic / modern-blue
still use React-PDF fonts bundled in the same image.

## Operator docs

- Agent skill: `.cursor/skills/ats-resume/SKILL.md`
- LLM tailoring slice: `ATS_RESUME_PROMPT` in `packages/shared/src/schemas/resume-layout-defaults.ts`
