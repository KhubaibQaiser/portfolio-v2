# ATS Resume (ats-resume layout)

Carlito single-column A4 resume rendered with React-PDF — same engine as
classic and modern-blue.

- **Print spec:** `packages/ui/src/resume-pdf/ats-print-spec.ts`
- **Document:** `packages/ui/src/resume-pdf/resume-ats-document.tsx`
- **Reference data:** `packages/ui/src/resume-pdf/fixtures/ats-resume-reference.ts`
- **Pipeline:** CMS + JD → `tailoredResumeSchema` JSON → policy + fabrication →
  `applyTailoredResume` → `trimAtsResumeForPage` → React-PDF. The model never
  returns markup.
- **Public `/api/pdf`:** uses `pickDefaultResumeLayout`. Setting this layout as
  default in admin serves this PDF on the portfolio download.

Specs: `specs/resume-ai.md`, `specs/resume-ats-react-pdf.md`.

## Content rules (do not weaken)

1. Include every experience role. Never drop a role to save space.
2. Trim overflow by removing bullets from oldest roles first.
3. No markdown bold, smart quotes, en/em dashes.
4. Dates are `MM/YYYY - MM/YYYY` (education year-only is fine).
5. `titleOverride` is null or exactly `Senior Software Engineer` or
   `Senior Fullstack Engineer`.
6. Dehyphenate compound modifiers in prose. Allowed hyphens:
   Quaid-i-Azam, Content-to-Commerce, and one JD-required hyphenated skill
   phrase if needed.

Prompt text lives in `ATS_RESUME_PROMPT` in
`packages/shared/src/schemas/resume-layout-defaults.ts`.
