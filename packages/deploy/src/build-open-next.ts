#!/usr/bin/env node
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getSsmParameter } from "./aws-cli.js";
import { ssmPaths, DEFAULT_APP_NAME } from "./ssm-paths.js";
import { verifyImageRemotePatterns } from "./verify-image-config.js";
import {
  assertPrerenderHasNoDemoSeed,
  assertWebBuildUsesDynamo,
  openNextBuildEnv,
  type OpenNextApp,
} from "./web-prerender.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
const appName = process.env.PORTFOLIO_APP_NAME ?? DEFAULT_APP_NAME;
const paths = ssmPaths(appName);

const mediaPublicBaseUrl = getSsmParameter(paths.mediaPublicBaseUrl, region);
const mediaHostname = new URL(mediaPublicBaseUrl).hostname;

console.log(`Resolved MEDIA_PUBLIC_BASE_URL=${mediaPublicBaseUrl}`);

const sharedBuildEnv: NodeJS.ProcessEnv = {
  ...process.env,
  MEDIA_PUBLIC_BASE_URL: mediaPublicBaseUrl,
  PORTFOLIO_OPENNEXT_BUILD: "1",
};

const openNextApps = [
  { app: "web", filter: "@portfolio/web", dir: path.join(repoRoot, "apps/web") },
  { app: "admin", filter: "@portfolio/admin", dir: path.join(repoRoot, "apps/admin") },
] as const satisfies ReadonlyArray<{
  app: OpenNextApp;
  filter: string;
  dir: string;
}>;

for (const { app, filter, dir } of openNextApps) {
  const buildEnv = openNextBuildEnv(app, sharedBuildEnv);
  if (app === "web") assertWebBuildUsesDynamo(buildEnv);

  console.log(`\nBuilding ${filter} (open-next)…`);
  execSync(`pnpm --filter ${filter} exec open-next build`, {
    cwd: repoRoot,
    stdio: "inherit",
    env: buildEnv,
  });
  verifyImageRemotePatterns(dir, mediaHostname);
  console.log(`Verified image remotePatterns include ${mediaHostname} for ${filter}`);
  if (app === "web") {
    assertPrerenderHasNoDemoSeed(dir);
    console.log("Verified web prerender does not contain the demo seed");
  }
}

console.log("\nBuilding Storybook…");
execSync("pnpm --filter @portfolio/ui build-storybook", {
  cwd: repoRoot,
  stdio: "inherit",
  env: sharedBuildEnv,
});

console.log("\nOpenNext deploy artifacts ready.");
