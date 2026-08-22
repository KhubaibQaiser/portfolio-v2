import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import type { InfraConfig } from "../config";
import { AdminStack } from "./admin-stack";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

const baseConfig: InfraConfig = {
  region: "eu-west-1",
  appName: "Portfolio",
  domainName: "khubaibqaiser.com",
  domainEnabled: false,
  tablePrefix: "portfolio",
  mediaCorsOrigins: [],
  adminUrls: [],
  adminAllowedEmails: [],
  monthlyBudgetUsd: 25,
  mcpCognitoDomainPrefix: "khubaibqaiser-com-candidate-mcp",
};

function writeMinimalOpenNext(openNextDir: string): void {
  const assetsDir = path.join(openNextDir, "assets");
  const cacheDir = path.join(openNextDir, "cache");
  const serverFnDir = path.join(openNextDir, "server-functions", "default");
  const imageFnDir = path.join(openNextDir, "image-optimization-function");

  mkdirSync(assetsDir, { recursive: true });
  mkdirSync(cacheDir, { recursive: true });
  mkdirSync(serverFnDir, { recursive: true });
  mkdirSync(imageFnDir, { recursive: true });

  writeFileSync(path.join(assetsDir, "BUILD_ID"), "test-build-id");
  writeFileSync(path.join(serverFnDir, "index.js"), "exports.handler = async () => ({ statusCode: 200 });");
  writeFileSync(
    path.join(imageFnDir, "index.js"),
    "exports.handler = async () => ({ statusCode: 200 });",
  );
}

function synth(): Template {
  const openNextDir = path.join(repoRoot, "packages/infra/fixtures/minimal-open-next-admin");
  writeMinimalOpenNext(openNextDir);

  const app = new cdk.App();
  const stack = new AdminStack(app, "Admin", {
    env: { account: "123456789012", region: "eu-west-1" },
    config: baseConfig,
    openNextDir,
    renderJobDlqHandlerEntry: path.join(
      repoRoot,
      "apps/admin/src/lambda/render-job-dlq-handler/index.ts",
    ),
    generationJobWorkerEntry: path.join(
      repoRoot,
      "apps/admin/src/lambda/generation-job-worker/index.ts",
    ),
    generationJobDlqHandlerEntry: path.join(
      repoRoot,
      "apps/admin/src/lambda/generation-job-dlq-handler/index.ts",
    ),
    depsLockFilePath: path.join(repoRoot, "pnpm-lock.yaml"),
    resumeFontsDir: path.join(repoRoot, "packages/ui/src/resume-pdf/fonts"),
    repoRoot,
  });
  return Template.fromStack(stack);
}

describe("AdminStack render worker", () => {
  it("uses a container image for RenderJobWorker (XeLaTeX for ats-resume)", () => {
    const template = synth();
    const functions = template.findResources("AWS::Lambda::Function");
    const renderWorker = Object.values(functions).find(
      (resource) =>
        resource.Properties?.Environment?.Variables?.POWERTOOLS_SERVICE_NAME ===
        "portfolio-admin-render-job-worker",
    );
    expect(renderWorker?.Properties?.PackageType).toBe("Image");
    expect(renderWorker?.Properties?.MemorySize).toBe(3008);
    expect(renderWorker?.Properties?.Timeout).toBe(300);
  });
});
