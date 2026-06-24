#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import { resolveConfig } from "../src/config";
import { DataStack } from "../src/stacks/data-stack";
import { DnsStack } from "../src/stacks/dns-stack";
import { CertStack } from "../src/stacks/cert-stack";
import { WebStack } from "../src/stacks/web-stack";
import { AdminStack } from "../src/stacks/admin-stack";
import { AuthStack } from "../src/stacks/auth-stack";
import { SharedStack } from "../src/stacks/shared-stack";
import { OidcStack } from "../src/stacks/oidc-stack";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const app = new cdk.App();
const config = resolveConfig(app);

const primaryEnv: cdk.Environment = {
  account: config.account,
  region: config.region,
};
// CloudFront certs and (colocated) DNS must live in us-east-1.
const edgeEnv: cdk.Environment = {
  account: config.account,
  region: "us-east-1",
};

cdk.Tags.of(app).add("project", config.appName);
cdk.Tags.of(app).add("managed-by", "cdk");

const data = new DataStack(app, `${config.appName}-Data`, {
  env: primaryEnv,
  config,
  description: "DynamoDB single-table + S3 media bucket for the portfolio",
});

new WebStack(app, `${config.appName}-Web`, {
  env: primaryEnv,
  config,
  openNextDir: path.join(repoRoot, "apps/web/.open-next"),
  table: data.table,
  mediaBucket: data.mediaBucket,
  description: "Web app (OpenNext on Lambda + CloudFront)",
});

new AdminStack(app, `${config.appName}-Admin`, {
  env: primaryEnv,
  config,
  openNextDir: path.join(repoRoot, "apps/admin/.open-next"),
  table: data.table,
  mediaBucket: data.mediaBucket,
  description: "Admin dashboard (OpenNext on Lambda + CloudFront)",
});

new AuthStack(app, `${config.appName}-Auth`, {
  env: primaryEnv,
  config,
  description: "Cognito user pool + Hosted UI for the admin dashboard",
});

new SharedStack(app, `${config.appName}-Shared`, {
  env: primaryEnv,
  config,
  table: data.table,
  description:
    "Shared platform services: EventBridge bus, SNS alerts, SES, budget, alarms, dashboard",
});

// CI deploy role. Opt-in: only when the GitHub repo is configured.
if (config.githubRepo) {
  new OidcStack(app, `${config.appName}-Oidc`, {
    env: primaryEnv,
    config,
    description: "GitHub Actions OIDC deploy role",
  });
}

const dns = new DnsStack(app, `${config.appName}-Dns`, {
  env: edgeEnv,
  config,
  description: "Route 53 public hosted zone for the apex domain",
});

// The cert can only validate once registrar nameservers are delegated, so it
// is opt-in. Until then sites run on their default CloudFront URLs.
if (config.domainEnabled) {
  new CertStack(app, `${config.appName}-Cert`, {
    env: edgeEnv,
    config,
    hostedZone: dns.hostedZone,
    description: "us-east-1 ACM certificate for CloudFront",
  });
}

app.synth();
