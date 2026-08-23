# ATS Resume — React-PDF contract

Contract for the `ats-resume` layout (`component_key: "ats-resume"`). Visual
truth is the React-PDF print spec plus the reference `ResumeData` fixture.

## Assets

| Path                                                          | Role                          |
| ------------------------------------------------------------- | ----------------------------- |
| `packages/ui/src/resume-pdf/ats-print-spec.ts`                | Locked A4 / Carlito / spacing |
| `packages/ui/src/resume-pdf/resume-ats-document.tsx`          | Document shell                |
| `packages/ui/src/resume-pdf/fixtures/ats-resume-reference.ts` | Reference content             |
| `packages/ui/src/resume-pdf/fonts/Carlito-*.ttf`              | OFL Carlito faces             |

## Pipeline

1. LLM returns `tailoredResumeSchema` JSON (never raw markup).
2. `enforceResumeGenerationPolicy` + `validateFabrication` (see `specs/resume-ai.md`).
3. `applyTailoredResume` merges into `ResumeData`.
4. `trimAtsResumeForPage` (never drop roles; oldest bullets first).
5. `ResumeAtsDocument` via `renderResumePdfBuffer`.
6. Tailored renders run `verifyAtsResumePdf` (one page, no banned Unicode, numeric dates).

Public `/api/pdf` uses `pickDefaultResumeLayout`. When the CMS default is
`ats-resume`, the same React-PDF path serves the download.

## Layout rules

- Page: A4, margins 0.5in top/bottom, 0.45in left/right.
- Font: Carlito only.
- Section order: Professional Summary, Technical Skills, Professional
  Experience, Education, Languages, optional Personal Projects.
- Dates: `MM/YYYY - MM/YYYY` (education year-only exempt).
- One page. Overflow trims bullets from oldest roles; roles are never dropped.

## Tests

`packages/ui/src/resume-pdf/resume-ats-document.test.ts` asserts one page,
section titles, and name/contact point sizes against the reference fixture.
