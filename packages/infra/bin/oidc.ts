#!/usr/bin/env node
/**
 * Synth only the GitHub deploy role. The full app (`bin/portfolio.ts`) reads
 * OpenNext build output while constructing the web and admin stacks, so this
 * entry updates IAM before that build exists.
 */
import * as cdk from "aws-cdk-lib";
import { resolveConfig } from "../src/config";
import { OidcStack } from "../src/stacks/oidc-stack";

const app = new cdk.App();
const config = resolveConfig(app);
if (!config.githubRepo) {
  throw new Error("OIDC deploy requires -c githubRepo=owner/name.");
}

const primaryEnv: cdk.Environment = {
  account: config.account,
  region: config.region,
};

new OidcStack(app, `${config.appName}-Oidc`, {
  env: primaryEnv,
  config,
  description: "GitHub Actions OIDC deploy role",
});

app.synth();
