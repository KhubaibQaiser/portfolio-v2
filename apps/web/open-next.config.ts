import type { OpenNextConfig } from "@opennextjs/aws/types/open-next";

/**
 * OpenNext build config for the web app. Defaults target AWS Lambda (arm64).
 * The server function uses the streaming wrapper so the AI chat route can
 * stream tokens through the Lambda function URL + CloudFront.
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
      packages: [
        "@swc/helpers@0.5.15",
        "styled-jsx@5.1.6",
        "@next/env@16.2.9",
        // Turbopack externalizes @react-pdf/renderer into .next/node_modules; install
        // here so transitive @react-pdf/* resolve from the Lambda root node_modules.
        "@react-pdf/renderer@4.4.1",
      ],
      arch: "arm64",
    },
  },
  dangerous: {
    disableTagCache: true,
  },
  packageJsonPath: "../../",
} satisfies OpenNextConfig;

export default config;
