import type { OpenNextConfig } from "@opennextjs/aws/types/open-next";
import { OPEN_NEXT_LAMBDA_PACKAGES } from "@portfolio/deploy/open-next-lambda-deps";

/**
 * OpenNext build config for the admin app. Mirrors the web app: AWS Lambda
 * (arm64) with the streaming wrapper so the resume-builder AI route can stream
 * tokens through the Lambda function URL + CloudFront.
 *
 * Tag cache disabled — admin is force-dynamic; keeps the build from emitting
 * tag-cache/queue artifacts the shared construct no longer provisions.
 */
const config = {
  default: {
    override: {
      wrapper: "aws-lambda-streaming",
      queue: "direct",
    },
    install: {
      packages: [...OPEN_NEXT_LAMBDA_PACKAGES],
      arch: "arm64",
    },
  },
  dangerous: {
    disableTagCache: true,
  },
  packageJsonPath: "../../",
} satisfies OpenNextConfig;

export default config;
