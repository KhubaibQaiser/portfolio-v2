/**
 * Packages OpenNext must npm-install into the Lambda artifact root node_modules.
 *
 * Turbopack (Next.js 16 default) externalizes some Node deps into
 * `.next/node_modules/` with hashed names. Those externals still require their
 * transitive deps at runtime via normal Node resolution walking up to the
 * Lambda task root. Listing them here ensures the full dependency tree is
 * present alongside any Turbopack externals.
 *
 * Pin versions to match packages/data and packages/ai. Webpack production
 * builds (`next build --webpack`) reduce reliance on this list but it remains
 * a safety net for any remaining externals.
 */
export const OPEN_NEXT_LAMBDA_PACKAGES = [
  "@swc/helpers@0.5.15",
  "styled-jsx@5.1.6",
  "@next/env@16.2.9",
  "@react-pdf/renderer@4.4.1",
  "@aws-sdk/client-s3@3.1075.0",
  "@aws-sdk/s3-request-presigner@3.1075.0",
  "@aws-sdk/client-dynamodb@3.1075.0",
  "@aws-sdk/lib-dynamodb@3.1075.0",
  "@aws-sdk/client-secrets-manager@3.1075.0",
] as const;
