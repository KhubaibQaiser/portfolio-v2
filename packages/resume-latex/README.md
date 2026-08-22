# @portfolio/resume-latex

XeLaTeX renderer for the admin `ats-resume` layout. Maps validated `ResumeData`
to vendored `resume_template.tex`, compiles with Carlito, and verifies the PDF.

Public portfolio React-PDF exports do not use this package.

## Local setup (Debian/Ubuntu)

```bash
sudo apt-get update
sudo apt-get install -y texlive-xetex fonts-crosextra-carlito poppler-utils
```

Compile the vendored reference (golden master):

```bash
cd packages/resume-latex/templates
xelatex resume_template.tex
xelatex resume_template.tex
```

## Tests

From repo root (requires `xelatex` and `pdftoppm` for visual regression):

```bash
pnpm test packages/resume-latex
```

Visual regression rasterizes the golden PDF at **150 DPI** and expects a
0-pixel diff against builder output for `fixtures/ats-resume-reference.ts`.

Regenerate the committed golden PNG after template changes:

```bash
pdftoppm -png -r 150 -singlefile \
  packages/resume-latex/fixtures/Khubaib_Qaiser_LaTeX_Template_Reference.pdf \
  packages/resume-latex/fixtures/Khubaib_Qaiser_LaTeX_Template_Reference-page
```

## Lambda

The admin render worker runs in a container image with TeX Live — see
`packages/infra/docker/render-job-worker/`.
