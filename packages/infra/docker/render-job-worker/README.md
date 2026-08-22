# Render job worker — Lambda container image with XeLaTeX

The admin render-job worker compiles `ats-resume` PDFs with XeLaTeX and Carlito.
This image extends the AWS Node.js 22 Lambda base with a minimal TeX Live profile,
Poppler (`pdftotext` / `pdfinfo` for verify), and resume assets.

## Build context

CDK passes the **monorepo root** as the Docker build context
(`DockerImageCode.fromImageAsset(repoRoot, { file: "packages/infra/docker/render-job-worker/Dockerfile" })`).

## Contents

- Bundled `apps/admin/src/lambda/render-job-worker/index.ts` handler
- `resume-latex/templates/resume_template.tex` at `/var/task/resume-latex/templates/`
- React-PDF fonts at `/var/task/public/fonts/` (classic / modern-blue exports)

## Local smoke test

```bash
docker build -f packages/infra/docker/render-job-worker/Dockerfile -t portfolio-render-worker .
docker run --rm portfolio-render-worker xelatex --version
```

Deploy builds the image during `cdk deploy` (requires Docker on the deploy host).
