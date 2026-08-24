import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { NextjsSite } from "./nextjs-site";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

function writeMinimalOpenNext(openNextDir: string): void {
  const assetsDir = path.join(openNextDir, "assets");
  const hashedCssDir = path.join(assetsDir, "_next", "static", "css");
  const cacheDir = path.join(openNextDir, "cache");
  const serverFnDir = path.join(openNextDir, "server-functions", "default");
  const imageFnDir = path.join(openNextDir, "image-optimization-function");

  mkdirSync(hashedCssDir, { recursive: true });
  mkdirSync(cacheDir, { recursive: true });
  mkdirSync(serverFnDir, { recursive: true });
  mkdirSync(imageFnDir, { recursive: true });

  writeFileSync(path.join(assetsDir, "BUILD_ID"), "test-build-id");
  writeFileSync(path.join(assetsDir, "favicon.ico"), "");
  writeFileSync(path.join(hashedCssDir, "test.abc123.css"), "body{}");
  writeFileSync(path.join(cacheDir, ".keep"), "");
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
    "packages/infra/fixtures/minimal-open-next-nextjs-site",
  );
  writeMinimalOpenNext(openNextDir);

  const app = new cdk.App();
  const stack = new cdk.Stack(app, "NextjsSiteTest", {
    env: { account: "123456789012", region: "eu-west-1" },
  });
  new NextjsSite(stack, "Site", {
    openNextDir,
    region: "eu-west-1",
  });
  return Template.fromStack(stack);
}

function dependsOnList(resource: { DependsOn?: string | string[] }): string[] {
  if (!resource.DependsOn) return [];
  return Array.isArray(resource.DependsOn) ? resource.DependsOn : [resource.DependsOn];
}

describe("NextjsSite asset deploy", () => {
  it("splits hashed/public/cache uploads, retains hashes, and orders Lambda after assets", () => {
    const template = synth();

    template.resourceCountIs("Custom::CDKBucketDeployment", 3);

    // Unused hashed builds expire after 30 days under _assets/_next/.
    template.hasResourceProperties("AWS::S3::Bucket", {
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          Match.objectLike({
            Id: "ExpireUnusedHashedAssets",
            Prefix: "_assets/_next/",
            Status: "Enabled",
            ExpirationInDays: 30,
          }),
        ]),
      },
    });

    // Mid-deploy S3 misses must not stick for five minutes; no SPA rewrite.
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        CustomErrorResponses: Match.arrayWith([
          Match.objectLike({
            ErrorCode: 403,
            ErrorCachingMinTTL: 0,
          }),
          Match.objectLike({
            ErrorCode: 404,
            ErrorCachingMinTTL: 0,
          }),
        ]),
      }),
    });
    const [distribution] = Object.values(
      template.findResources("AWS::CloudFront::Distribution"),
    );
    const errorResponses =
      distribution?.Properties?.DistributionConfig?.CustomErrorResponses ?? [];
    for (const response of errorResponses) {
      expect(response.ResponsePagePath).toBeUndefined();
    }

    const deployments = Object.entries(
      template.findResources("Custom::CDKBucketDeployment"),
    );
    const pruned = deployments.filter(([, r]) => r.Properties?.Prune === true);
    const retained = deployments.filter(([, r]) => r.Properties?.Prune === false);
    // CacheDeployment prunes; HashedAssets + PublicAssets retain.
    expect(pruned).toHaveLength(1);
    expect(retained).toHaveLength(2);

    // Only PublicAssets attaches a CloudFront invalidation.
    const withInvalidation = deployments.filter(
      ([, r]) => r.Properties?.DistributionId !== undefined,
    );
    expect(withInvalidation).toHaveLength(1);
    expect(withInvalidation[0]?.[1].Properties?.Prune).toBe(false);

    // Server Lambda waits for hashed assets + ISR cache seed.
    const serverFnEntry = Object.entries(
      template.findResources("AWS::Lambda::Function"),
    ).find(([, resource]) => {
      const env = resource.Properties?.Environment?.Variables;
      return env?.OPEN_NEXT_BUILD_ID === "test-build-id";
    });
    expect(serverFnEntry).toBeDefined();
    const [, serverFn] = serverFnEntry!;
    const dependsOn = dependsOnList(serverFn);

    const hashedLogicalId = retained.find(([id]) => /HashedAssets/i.test(id))?.[0];
    const cacheLogicalId = pruned[0]?.[0];
    expect(hashedLogicalId).toBeDefined();
    expect(cacheLogicalId).toBeDefined();

    // DependsOn may reference the Custom::CDKBucketDeployment logical id or a
    // nested CustomResource; match by construct path fragment.
    expect(
      dependsOn.some(
        (dep) =>
          dep.includes("HashedAssets") ||
          (hashedLogicalId !== undefined && dep.includes(hashedLogicalId)),
      ),
    ).toBe(true);
    expect(
      dependsOn.some(
        (dep) =>
          dep.includes("CacheDeployment") ||
          (cacheLogicalId !== undefined && dep.includes(cacheLogicalId)),
      ),
    ).toBe(true);
  }, 60_000);
});
