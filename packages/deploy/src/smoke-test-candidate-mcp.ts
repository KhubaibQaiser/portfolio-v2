#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { getSecretJson, getStackOutput } from "./aws-cli.js";
import { DEFAULT_APP_NAME } from "./ssm-paths.js";

const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
const appName = process.env.PORTFOLIO_APP_NAME ?? DEFAULT_APP_NAME;
const stackName = `${appName}-CandidateMcp`;

// Mirrors the secret name candidate-mcp-stack.ts writes the n8n client's
// Cognito credentials to — kept as a plain string here (not imported) since
// packages/deploy doesn't otherwise depend on packages/infra.
const secretId = `/${appName.toLowerCase()}/candidate-mcp/n8n-workflow-client`;

type ClientCredentials = {
  clientId: string;
  clientSecret: string;
  tokenEndpoint: string;
  scope: string;
};

const serverUrl = getStackOutput(stackName, "ServerUrl", region);
console.log(`Smoke testing candidate-mcp: ${serverUrl}`);

// --- 1. An unauthenticated call must be rejected with an RFC 6750 challenge. ---
const unauthHeadersFile = "/tmp/candidate-mcp-smoke-unauth-headers.txt";
const unauthCode = execFileSync(
  "curl",
  [
    "-s",
    "--max-time",
    "15",
    "-D",
    unauthHeadersFile,
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

const unauthHeaders = readFileSync(unauthHeadersFile, "utf8");
if (!/www-authenticate:\s*Bearer/i.test(unauthHeaders)) {
  throw new Error(
    `Expected 401 WWW-Authenticate: Bearer challenge, got headers:\n${unauthHeaders}`,
  );
}
if (!/resource_metadata=/i.test(unauthHeaders)) {
  throw new Error(
    `Expected resource_metadata in WWW-Authenticate, got headers:\n${unauthHeaders}`,
  );
}
console.log("Unauthenticated request correctly rejected with 401 + WWW-Authenticate.");

// --- 2. A real client-credentials grant must succeed end-to-end. ---
const credentials = getSecretJson<ClientCredentials>(secretId, region);

const tokenResponse = execFileSync(
  "curl",
  [
    "-sf",
    "--max-time",
    "15",
    "-u",
    `${credentials.clientId}:${credentials.clientSecret}`,
    "-d",
    "grant_type=client_credentials",
    "-d",
    `scope=${credentials.scope}`,
    credentials.tokenEndpoint,
  ],
  { encoding: "utf8" },
).trim();

const { access_token: accessToken } = JSON.parse(tokenResponse) as {
  access_token?: string;
};
if (!accessToken) {
  throw new Error(
    `Token endpoint ${credentials.tokenEndpoint} did not return an access_token.`,
  );
}
console.log("Obtained an access token via the client-credentials grant.");

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
      `authorization: Bearer ${accessToken}`,
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
