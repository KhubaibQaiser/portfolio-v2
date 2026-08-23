# ADR 0004: ATS resume renderer (superseded)

## Status

Superseded. `ats-resume` is a React-PDF layout (Carlito) rendered by the same
engine as classic and modern-blue. See `specs/resume-ats-react-pdf.md`.

## Context (historical)

Admin Resume AI originally compiled a Carlito ATS template with a second
engine in a Lambda container image. That split public `/api/pdf` (React-PDF)
from admin exports and required arm64 image builds in CI.

## Current decision

One React-PDF renderer registry key set: `classic`, `modern-blue`,
`ats-resume`. Public `/api/pdf` and admin render jobs both honor the CMS
default layout. The admin render worker is a zip Node.js function.
