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
  writeFileSync(
    path.join(serverFnDir, "index.js"),
    "exports.handler = async () => ({ statusCode: 200 });",
  );
  writeFileSync(
    path.join(imageFnDir, "index.js"),
    "exports.handler = async () => ({ statusCode: 200 });",
  );
}

function synth(): Template {
  const openNextDir = path.join(
    repoRoot,
    "packages/infra/fixtures/minimal-open-next-admin",
  );
  writeMinimalOpenNext(openNextDir);

  const app = new cdk.App();
  const stack = new AdminStack(app, "Admin", {
    env: { account: "123456789012", region: "eu-west-1" },
    config: baseConfig,
    openNextDir,
    renderJobWorkerEntry: path.join(
      repoRoot,
      "apps/admin/src/lambda/render-job-worker/index.ts",
    ),
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
    jobIngestWorkerEntry: path.join(
      repoRoot,
      "apps/admin/src/lambda/job-ingest-worker/index.ts",
    ),
    jobNotifyWorkerEntry: path.join(
      repoRoot,
      "apps/admin/src/lambda/job-notify-worker/index.ts",
    ),
    depsLockFilePath: path.join(repoRoot, "pnpm-lock.yaml"),
    resumeFontsDir: path.join(repoRoot, "packages/ui/src/resume-pdf/fonts"),
  });
  return Template.fromStack(stack);
}

describe("AdminStack render worker", () => {
  it("uses a zip NodejsFunction for RenderJobWorker", () => {
    const template = synth();
    const functions = template.findResources("AWS::Lambda::Function");
    const renderWorker = Object.values(functions).find(
      (resource) =>
        resource.Properties?.Environment?.Variables?.POWERTOOLS_SERVICE_NAME ===
        "portfolio-admin-render-job-worker",
    );
    expect(renderWorker?.Properties?.PackageType).not.toBe("Image");
    expect(renderWorker?.Properties?.Runtime).toBe("nodejs22.x");
    expect(renderWorker?.Properties?.MemorySize).toBe(2048);
    expect(renderWorker?.Properties?.Timeout).toBe(300);
  }, 30_000);

  it("schedules sequential job ingest every 4h without reserved concurrency", () => {
    const template = synth();
    const functions = template.findResources("AWS::Lambda::Function");
    const ingest = Object.values(functions).find(
      (resource) =>
        resource.Properties?.Environment?.Variables?.POWERTOOLS_SERVICE_NAME ===
        "portfolio-admin-job-ingest-worker",
    );
    expect(ingest?.Properties?.ReservedConcurrentExecutions).toBeUndefined();
    expect(ingest?.Properties?.Runtime).toBe("nodejs22.x");
    template.hasResourceProperties("AWS::Events::Rule", {
      ScheduleExpression: "rate(4 hours)",
    });
  }, 30_000);

  it("schedules the morning digest at 07:00 UTC without reserved concurrency", () => {
    const template = synth();
    const functions = template.findResources("AWS::Lambda::Function");
    const notify = Object.values(functions).find(
      (resource) =>
        resource.Properties?.Environment?.Variables?.POWERTOOLS_SERVICE_NAME ===
        "portfolio-admin-job-notify-worker",
    );
    expect(notify?.Properties?.ReservedConcurrentExecutions).toBeUndefined();
    template.hasResourceProperties("AWS::Events::Rule", {
      ScheduleExpression: "cron(0 7 * * ? *)",
    });
  }, 30_000);

  it("does not reserve Lambda concurrency (personal-account UnreservedConcurrentExecution floor)", () => {
    const template = synth();
    const functions = template.findResources("AWS::Lambda::Function");
    for (const resource of Object.values(functions)) {
      expect(resource.Properties?.ReservedConcurrentExecutions).toBeUndefined();
    }
  }, 30_000);
});
