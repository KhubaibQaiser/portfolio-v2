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

- Page: A4, margins 13mm top/bottom, 14mm left/right.
- Font: Carlito Regular and Bold only. Name 22pt, section headings 11pt,
  company 10pt, body 9–9.5pt.
- Contact row: location, phone, email, site, GitHub, LinkedIn. Linked items
  use short URL labels (no CMS names like "GitHub"). Empty fields are omitted.
- Experience entry: company + `MM/YYYY - MM/YYYY` on one row, then role and
  location, then bullets. Recent roles keep visual weight via bullet count.
- Section order: Professional Summary, Technical Skills, Professional
  Experience, Projects, Education, then optional Languages / Certifications /
  Remote Work / References when CMS `visibleSections` and layout guidelines
  both enable them and the data is non-empty.
- Dates: `MM/YYYY - MM/YYYY` (education year-only exempt).
- One page. Overflow trims bullets from oldest roles; roles are never dropped.

## Tests

`packages/ui/src/resume-pdf/resume-ats-document.test.ts` asserts one page,
section titles, contact short URLs, extraction order, and name/contact point
sizes against the reference fixture.
