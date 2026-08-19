#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { getStackOutput } from "./aws-cli.js";
import { DEFAULT_APP_NAME } from "./ssm-paths.js";

const primaryRegion = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "eu-west-1";
const appName = process.env.PORTFOLIO_APP_NAME ?? DEFAULT_APP_NAME;
const certStackName = `${appName}-Cert`;

/** Consumer stacks whose CloudFront distributions must pick up the current cert ARN. */
const consumerStacks = [`${appName}-Web`, `${appName}-Admin`, `${appName}-Storybook`] as const;

/**
 * After an ACM cert replacement in Portfolio-Cert (us-east-1), CDK's cross-region
 * SSM exports in eu-west-1 can remain pinned to the superseded ARN while Cert
 * cleanup waits for CloudFront to cut over. Sync those parameters from the Cert
 * stack output, then redeploy the consumer stacks (--exclusively) so CloudFront
 * releases the old cert and Portfolio-Cert cleanup can finish.
 */
function listCertExportParameterNames(stackName: string): string[] {
  const prefix = `/cdk/exports/${stackName}/`;
  const output = execFileSync(
    "aws",
    [
      "ssm",
      "get-parameters-by-path",
      "--path",
      prefix,
      "--recursive",
      "--region",
      primaryRegion,
      "--query",
      "Parameters[?contains(Name, `SiteCertificate`)].Name",
      "--output",
      "text",
    ],
    { encoding: "utf8" },
  ).trim();

  if (!output) {
    return [];
  }

  return output.split(/\s+/).filter(Boolean);
}

function putSsmParameter(name: string, value: string): void {
  execFileSync(
    "aws",
    [
      "ssm",
      "put-parameter",
      "--name",
      name,
      "--value",
      value,
      "--type",
      "String",
      "--overwrite",
      "--region",
      primaryRegion,
    ],
    { stdio: "inherit" },
  );
}

const certArn = getStackOutput(certStackName, "CertificateArn", "us-east-1");
console.log(`Syncing cross-region cert export to ${certArn}`);

let updated = 0;
for (const stackName of consumerStacks) {
  const parameterNames = listCertExportParameterNames(stackName);
  if (parameterNames.length === 0) {
    console.warn(`No SiteCertificate export parameter found under /cdk/exports/${stackName}/ — skipping.`);
    continue;
  }

  for (const name of parameterNames) {
    const current = execFileSync(
      "aws",
      [
        "ssm",
        "get-parameter",
        "--name",
        name,
        "--region",
        primaryRegion,
        "--query",
        "Parameter.Value",
        "--output",
        "text",
      ],
      { encoding: "utf8" },
    ).trim();

    if (current === certArn) {
      console.log(`${name} already current — skipping.`);
      continue;
    }

    console.log(`${name}: ${current} → ${certArn}`);
    putSsmParameter(name, certArn);
    updated += 1;
  }
}

if (updated === 0) {
  console.log("No cross-region cert exports needed updating.");
} else {
  console.log(`Updated ${updated} cross-region cert export(s). Redeploy consumer stacks next.`);
}
