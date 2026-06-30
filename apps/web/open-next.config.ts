import type { OpenNextConfig } from "@opennextjs/aws/types/open-next";
import { OPEN_NEXT_LAMBDA_PACKAGES } from "@portfolio/deploy/open-next-lambda-deps";

/**
 * OpenNext build config for the web app. Defaults target AWS Lambda (arm64).
 * The server function uses the streaming wrapper so the AI chat route can stream
 * tokens through the Lambda function URL + CloudFront.
 *
 * Time-based ISR: no DynamoDB tag cache; stale pages regenerate via the
 * direct queue (self HEAD) into the S3 incremental cache.
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
