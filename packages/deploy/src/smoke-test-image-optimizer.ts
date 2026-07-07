#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { getSsmParameter, getStackOutput, listFirstS3Key } from "./aws-cli.js";
import { ssmPaths, DEFAULT_APP_NAME } from "./ssm-paths.js";

const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
const appName = process.env.PORTFOLIO_APP_NAME ?? DEFAULT_APP_NAME;
const paths = ssmPaths(appName);
const webStackName = `${appName}-Web`;

const mediaPublicBaseUrl = getSsmParameter(paths.mediaPublicBaseUrl, region).replace(
  /\/$/,
  "",
);
const mediaBucket = getSsmParameter(paths.mediaBucketName, region);
const siteUrl = getStackOutput(webStackName, "SiteUrl", region).replace(/\/$/, "");

const sampleKey = listFirstS3Key(mediaBucket, "media/", region);
if (!sampleKey) {
  const message = `No objects under s3://${mediaBucket}/media/. Upload media via the admin app, then re-run.`;
  if (process.env.CI === "true") {
    throw new Error(message);
  }
  console.warn(`Skipping image optimizer smoke test: ${message}`);
  process.exit(0);
}

const mediaObjectUrl = `${mediaPublicBaseUrl}/${sampleKey}`;
const optimizerUrl =
  `${siteUrl}/_next/image?` + `url=${encodeURIComponent(mediaObjectUrl)}&w=640&q=75`;

console.log(`Smoke testing image optimizer: ${optimizerUrl}`);

let curlMeta: string;
try {
  curlMeta = execFileSync(
    "curl",
    [
      "-sf",
      "--max-time",
      "30",
      "-o",
      "/dev/null",
      "-w",
      "%{http_code} %{content_type}",
      optimizerUrl,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  ).trim();
} catch {
  throw new Error(
    `Image optimizer smoke test failed for ${optimizerUrl}. ` +
      "Expected HTTP 200 with an image content type.",
  );
}

const contentType = curlMeta.split(/\s+/).slice(1).join(" ");
if (!contentType.startsWith("image/")) {
  throw new Error(
    `Image optimizer smoke test returned unexpected content type "${contentType}" for ${optimizerUrl}.`,
  );
}

console.log("Image optimizer smoke test passed.");
