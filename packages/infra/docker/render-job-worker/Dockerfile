# syntax=docker/dockerfile:1

# Bundle the render-job worker and monorepo dependencies.
FROM public.ecr.aws/lambda/nodejs:22-arm64 AS bundler

WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.json ./
COPY packages ./packages
COPY apps/admin ./apps/admin

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
RUN pnpm install --frozen-lockfile --filter @portfolio/admin...

RUN pnpm exec esbuild apps/admin/src/lambda/render-job-worker/index.ts \
  --bundle \
  --platform=node \
  --target=node22 \
  --format=cjs \
  --outfile=/out/index.js \
  --tsconfig=apps/admin/tsconfig.json

# Runtime image: Node.js Lambda + TeX Live for ats-resume.
FROM public.ecr.aws/lambda/nodejs:22-arm64

RUN dnf install -y \
    texlive-xetex \
    texlive-collection-latex \
    texlive-collection-fontsrecommended \
    poppler-utils \
    && dnf clean all

WORKDIR ${LAMBDA_TASK_ROOT}

COPY --from=bundler /out/index.js ./
COPY packages/resume-latex/templates ./resume-latex/templates/
COPY packages/ui/src/resume-pdf/fonts ./public/fonts/

CMD ["index.handler"]
