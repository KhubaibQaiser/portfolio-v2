# Render job worker — Lambda container image with XeLaTeX

The admin render-job worker compiles `ats-resume` PDFs with XeLaTeX and
**vendored Carlito** fonts. Classic / modern-blue / cover letters still use
React-PDF fonts bundled in the same image. Poppler (`pdftotext` / `pdfinfo`)
supports ATS PDF verify.

## Build context

CDK passes the **monorepo root** as the Docker build context:

```ts
DockerImageCode.fromImageAsset(repoRoot, {
  file: "packages/infra/docker/render-job-worker/Dockerfile",
  exclude: RENDER_JOB_WORKER_IMAGE_EXCLUDES,
});
```

`RENDER_JOB_WORKER_IMAGE_EXCLUDES` in `admin-stack.ts` (and root `.dockerignore`)
**must** exclude `cdk.out` / `**/cdk.out`. Otherwise CDK stages the asset into
`cdk.out/asset.*` which already contains `cdk.out`, nesting until
`ENAMETOOLONG` and breaking deploy (including Dns/Cert, because synth builds
all stacks).

Also excluded: `.open-next`, storybook output, coverage, logs, and
`packages/resume-latex/fixtures` (golden PDF/PNG are not needed at runtime).

The Dockerfile copies only the worker dependency slice
(`shared`, `data`, `ai`, `observability`, `resume-latex`, `ui`, `apps/admin`)
with package.json-first layers for cache friendliness.

## Contents

- Bundled `apps/admin/src/lambda/render-job-worker/index.ts` handler
- `resume_template.tex` at `/var/task/resume-latex/templates/`
- React-PDF fonts at `/var/task/public/fonts/`
- Carlito OFL fonts at `/usr/share/fonts/carlito/` (fontconfig; `\setmainfont{Carlito}`)
- Thin TeX Live packages (not full `collection-latex` / `fontsrecommended`)

## Local smoke test

```bash
docker build -f packages/infra/docker/render-job-worker/Dockerfile -t portfolio-render-worker .

docker run --rm --entrypoint xelatex portfolio-render-worker --version
docker run --rm --entrypoint pdftotext portfolio-render-worker -v

# Compile the vendored template (Carlito must resolve)
docker run --rm --entrypoint /bin/sh portfolio-render-worker -c '
  cd /tmp && cp /var/task/resume-latex/templates/resume_template.tex . &&
  xelatex -interaction=nonstopmode resume_template.tex &&
  pdfinfo resume_template.pdf
'
```

Local Debian/Ubuntu (without Docker): `texlive-xetex`, `fonts-crosextra-carlito`,
`poppler-utils`.

Deploy builds the image during `cdk deploy` (requires Docker on the deploy host).
