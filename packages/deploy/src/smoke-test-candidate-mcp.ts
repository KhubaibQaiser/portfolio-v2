#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { getSecretString, getStackOutput } from "./aws-cli.js";
import { DEFAULT_APP_NAME } from "./ssm-paths.js";

const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
const appName = process.env.PORTFOLIO_APP_NAME ?? DEFAULT_APP_NAME;
const stackName = `${appName}-CandidateMcp`;

const secretId = `/${appName.toLowerCase()}/candidate-mcp/smoke-test-key`;

const serverUrl = getStackOutput(stackName, "ServerUrl", region);
console.log(`Smoke testing candidate-mcp: ${serverUrl}`);

const unauthCode = execFileSync(
  "curl",
  [
    "-s",
    "--max-time",
    "15",
    "-o",
    "/dev/null",
    "-w",
    "%{http_code}",
    "-X",
    "POST",
    "-H",
    "content-type: application/json",
    "-H",
    "accept: application/json, text/event-stream",
    "--data",
    JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
    serverUrl,
  ],
  { encoding: "utf8" },
).trim();

if (unauthCode !== "401") {
  throw new Error(
    `Expected an unauthenticated request to ${serverUrl} to return 401, got ${unauthCode}.`,
  );
}
console.log("Unauthenticated request correctly rejected with 401.");

const apiKey = getSecretString(secretId, region).trim();
if (!apiKey) {
  throw new Error(`Secret ${secretId} did not contain a smoke-test bearer token.`);
}
console.log("Loaded smoke-test API key from Secrets Manager.");

const initializeBody = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "smoke-test", version: "1.0.0" },
  },
});

let mcpMeta: string;
try {
  mcpMeta = execFileSync(
    "curl",
    [
      "-sf",
      "--max-time",
      "15",
      "-o",
      "/dev/null",
      "-w",
      "%{http_code}",
      "-X",
      "POST",
      "-H",
      "content-type: application/json",
      "-H",
      "accept: application/json, text/event-stream",
      "-H",
      `authorization: Bearer ${apiKey}`,
      "--data",
      initializeBody,
      serverUrl,
    ],
    { encoding: "utf8" },
  ).trim();
} catch {
  throw new Error(`Authenticated \`initialize\` call to ${serverUrl} failed.`);
}

if (mcpMeta !== "200") {
  throw new Error(
    `Expected an authenticated \`initialize\` call to return 200, got ${mcpMeta}.`,
  );
}

console.log("Candidate-mcp smoke test passed.");
