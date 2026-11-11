import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import type { InfraConfig } from "../config";
import { WebStack } from "./web-stack";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

const config: InfraConfig = {
  region: "eu-west-1",
  appName: "Portfolio",
  domainName: "example.com",
  domainEnabled: false,
  tablePrefix: "portfolio",
  mediaCorsOrigins: [],
  adminUrls: [],
  adminAllowedEmails: [],
  monthlyBudgetUsd: 25,
  mcpCognitoDomainPrefix: "example-com-candidate-mcp",
};

function writeMinimalOpenNext(openNextDir: string): void {
  const serverFnDir = path.join(openNextDir, "server-functions", "default");
  const imageFnDir = path.join(openNextDir, "image-optimization-function");
  mkdirSync(path.join(openNextDir, "assets"), { recursive: true });
  mkdirSync(path.join(openNextDir, "cache"), { recursive: true });
  mkdirSync(serverFnDir, { recursive: true });
  mkdirSync(imageFnDir, { recursive: true });
  writeFileSync(path.join(openNextDir, "assets", "BUILD_ID"), "test-build-id");
  for (const dir of [serverFnDir, imageFnDir]) {
    writeFileSync(
      path.join(dir, "index.js"),
      "exports.handler = async () => ({ statusCode: 200 });",
    );
  }
}

function synth(): Template {
  const openNextDir = path.join(
    repoRoot,
    "packages/infra/fixtures/minimal-open-next-web",
  );
  writeMinimalOpenNext(openNextDir);
  const app = new cdk.App();
  const stack = new WebStack(app, "Web", {
    env: { account: "123456789012", region: "eu-west-1" },
    config,
    openNextDir,
    rebuildCanonicalPdfEntry: path.join(
      repoRoot,
      "apps/web/src/lambda/rebuild-canonical-pdf/index.ts",
    ),
    purgeSiteCacheEntry: path.join(
      repoRoot,
      "apps/web/src/lambda/purge-site-cache/index.ts",
    ),
    depsLockFilePath: path.join(repoRoot, "pnpm-lock.yaml"),
    resumeFontsDir: path.join(repoRoot, "packages/ui/src/resume-pdf/fonts"),
  });
  return Template.fromStack(stack);
}

function logicalIdByService(template: Template, service: string): string {
  const entry = Object.entries(template.findResources("AWS::Lambda::Function")).find(
    ([, r]) => r.Properties?.Environment?.Variables?.POWERTOOLS_SERVICE_NAME === service,
  );
  if (!entry) throw new Error(`no Lambda for ${service}`);
  return entry[0];
}

describe("WebStack on-demand content purge", () => {
  it("routes ContentChanged on the shared bus to the purge and PDF rebuild Lambdas", () => {
    const template = synth();
    const purgeId = logicalIdByService(template, "portfolio-web-purge-site-cache");
    const rebuildId = logicalIdByService(template, "portfolio-web-rebuild-canonical-pdf");

    const rules = Object.values(template.findResources("AWS::Events::Rule")).filter(
      (r) => r.Properties?.EventPattern?.["detail-type"]?.[0] === "ContentChanged",
    );
    expect(rules).toHaveLength(1);
    const rule = rules[0]!;
    expect(rule.Properties.EventBusName).toBe("Portfolio-bus");
    expect(rule.Properties.EventPattern.source).toEqual(["portfolio.admin"]);

    const targets = rule.Properties.Targets as Array<{
      Arn: { "Fn::GetAtt": [string, string] };
      RetryPolicy?: { MaximumRetryAttempts?: number };
    }>;
    expect(targets.map((t) => t.Arn["Fn::GetAtt"][0]).sort()).toEqual(
      [purgeId, rebuildId].sort(),
    );
    for (const target of targets) {
      expect(target.RetryPolicy?.MaximumRetryAttempts).toBe(2);
    }

    const purgeFn = template.findResources("AWS::Lambda::Function")[purgeId];
    const env = purgeFn?.Properties?.Environment?.Variables;
    expect(env?.CACHE_BUCKET_KEY_PREFIX).toBe("_cache");
    expect(env?.DISTRIBUTION_ID).toBeDefined();
    expect(env?.CACHE_BUCKET_NAME).toBeDefined();
  }, 60_000);
});
