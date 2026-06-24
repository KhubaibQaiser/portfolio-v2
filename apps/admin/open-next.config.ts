import type { OpenNextConfig } from "@opennextjs/aws/types/open-next";

/**
 * OpenNext build config for the admin app. Mirrors the web app: AWS Lambda
 * (arm64) with the streaming wrapper so the resume-builder AI route can stream
 * tokens through the Lambda function URL + CloudFront.
 */
const config = {
  default: {
    override: {
      wrapper: "aws-lambda-streaming",
    },
    // pnpm's strict node_modules means Next's runtime deps aren't always traced
    // into the standalone bundle; force-install them so the Lambda can resolve
    // them at runtime (arm64 to match the Lambda architecture).
    install: {
      packages: ["@swc/helpers@0.5.15", "styled-jsx@5.1.6", "@next/env@16.2.9"],
      arch: "arm64",
    },
  },
  // Monorepo: the package.json that owns the workspace lockfile is the root.
  packageJsonPath: "../../",
} satisfies OpenNextConfig;

export default config;
