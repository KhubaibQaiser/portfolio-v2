# syntax=docker/dockerfile:1

# Bundle the render-job worker with a narrow monorepo slice.
FROM public.ecr.aws/lambda/nodejs:22-arm64 AS bundler

WORKDIR /repo

# 1) Workspace manifests (layer-cache friendly)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/data/package.json packages/data/
COPY packages/ai/package.json packages/ai/
COPY packages/observability/package.json packages/observability/
COPY packages/resume-latex/package.json packages/resume-latex/
COPY packages/ui/package.json packages/ui/
COPY apps/admin/package.json apps/admin/tsconfig.json apps/admin/

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
RUN pnpm install --frozen-lockfile --filter @portfolio/admin...

# 2) Sources needed to esbuild the worker entry
COPY packages/shared packages/shared
COPY packages/data packages/data
COPY packages/ai packages/ai
COPY packages/observability packages/observability
COPY packages/resume-latex packages/resume-latex
COPY packages/ui packages/ui
COPY apps/admin/src apps/admin/src

RUN pnpm exec esbuild apps/admin/src/lambda/render-job-worker/index.ts \
  --bundle \
  --platform=node \
  --target=node22 \
  --format=cjs \
  --outfile=/out/index.js \
  --tsconfig=apps/admin/tsconfig.json

# Runtime: Node.js Lambda + XeLaTeX + Carlito + Poppler verify tools
FROM public.ecr.aws/lambda/nodejs:22-arm64

# Explicit TeX packages for resume_template.tex (not full collections).
# fontconfig is required for fc-cache so \setmainfont{Carlito} resolves.
RUN dnf install -y \
    fontconfig \
    texlive-xetex \
    texlive-latex \
    texlive-geometry \
    texlive-hyperref \
    texlive-enumitem \
    texlive-xcolor \
    texlive-euenc \
    texlive-fontspec \
    texlive-xltxtra \
    texlive-realscripts \
    poppler-utils \
    && dnf clean all

WORKDIR ${LAMBDA_TASK_ROOT}

COPY --from=bundler /out/index.js ./
COPY packages/resume-latex/templates ./resume-latex/templates/
COPY packages/ui/src/resume-pdf/fonts ./public/fonts/
COPY packages/resume-latex/fonts /usr/share/fonts/carlito/
RUN fc-cache -f

CMD ["index.handler"]
