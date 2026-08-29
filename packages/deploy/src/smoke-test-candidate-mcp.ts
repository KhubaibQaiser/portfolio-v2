#!/usr/bin/env node
/**
 * Post-deploy smoke for candidate-mcp:
 *   1) Auth/discovery gate (401 + PRM + AS + client_credentials)
 *   2) Legacy era Client SDK path
 *   3) Modern pinned 2026-07-28 Client SDK path
 *
 * Both eras must list tools and successfully call profile + facts.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
  Client,
  StreamableHTTPClientTransport,
  type ClientOptions,
  type ProtocolEra,
} from "@modelcontextprotocol/client";
import { getSecretJson, getStackOutput } from "./aws-cli.js";
import { DEFAULT_APP_NAME } from "./ssm-paths.js";

const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
const appName = process.env.PORTFOLIO_APP_NAME ?? DEFAULT_APP_NAME;
const stackName = `${appName}-CandidateMcp`;

const secretId = `/${appName.toLowerCase()}/candidate-mcp/n8n-workflow-client`;

type ClientCredentials = {
  clientId: string;
  clientSecret: string;
  tokenEndpoint: string;
  scope: string;
};

type ToolResult = {
  isError?: boolean;
  content: Array<{ type: string; text?: string }>;
};

function curlJson(url: string): string {
  return execFileSync("curl", ["-sf", "--max-time", "15", url], {
    encoding: "utf8",
  }).trim();
}

function requireToolText(result: ToolResult, label: string): string {
  if (result.isError) {
    throw new Error(`${label} returned isError=true: ${JSON.stringify(result.content)}`);
  }
  const text = result.content.find((c) => c.type === "text")?.text;
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new Error(`${label} missing non-empty text content: ${JSON.stringify(result)}`);
  }
  return text;
}

function assertProfileShape(jsonText: string): void {
  const parsed = JSON.parse(jsonText) as Record<string, unknown>;
  for (const key of ["site", "about", "resume", "experience", "skills"] as const) {
    if (!(key in parsed)) {
      throw new Error(`get_candidate_profile missing key "${key}"`);
    }
  }
}

async function assertLiveEra(
  serverUrl: string,
  accessToken: string,
  versionNegotiation: NonNullable<ClientOptions["versionNegotiation"]>,
  expectedEra: ProtocolEra,
): Promise<void> {
  const transport = new StreamableHTTPClientTransport(new URL(serverUrl), {
    authProvider: { token: async () => accessToken },
    onInsufficientScope: "throw",
  });
  const client = new Client(
    { name: "deploy-smoke", version: "1.0.0" },
    { versionNegotiation },
  );

  try {
    await client.connect(transport);
    const era = client.getProtocolEra();
    if (era !== expectedEra) {
      throw new Error(
        `Expected protocol era "${expectedEra}", got ${JSON.stringify(era)}`,
      );
    }

    const tools = await client.listTools();
    const names = new Set(tools.tools.map((t) => t.name));
    for (const required of ["get_candidate_profile", "get_candidate_facts"]) {
      if (!names.has(required)) {
        throw new Error(
          `listTools missing "${required}"; got ${JSON.stringify([...names])}`,
        );
      }
    }

    const profileResult = (await client.callTool({
      name: "get_candidate_profile",
    })) as ToolResult;
    assertProfileShape(requireToolText(profileResult, "get_candidate_profile"));

    const factsResult = (await client.callTool({
      name: "get_candidate_facts",
    })) as ToolResult;
    requireToolText(factsResult, "get_candidate_facts");
  } finally {
    await client.close();
  }
}

async function main(): Promise<void> {
  const serverUrl = getStackOutput(stackName, "ServerUrl", region);
  console.log(`Smoke testing candidate-mcp: ${serverUrl}`);

  // --- 1. Unauthenticated call must be rejected with RFC 6750 challenge. ---
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
  console.log("auth_gate_ok: unauthenticated 401 + WWW-Authenticate");

  const mcpOrigin = new URL(serverUrl).origin;

  // --- 1b. Public PRM + AS metadata ---
  const prm = JSON.parse(
    curlJson(`${mcpOrigin}/.well-known/oauth-protected-resource/mcp`),
  ) as {
    resource?: string;
    authorization_servers?: string[];
  };
  if (prm.resource !== serverUrl) {
    throw new Error(
      `PRM resource expected ${serverUrl}, got ${JSON.stringify(prm.resource)}.`,
    );
  }
  if (!prm.authorization_servers?.includes(mcpOrigin)) {
    throw new Error(
      `PRM authorization_servers must include ${mcpOrigin}, got ${JSON.stringify(prm.authorization_servers)}.`,
    );
  }
  console.log("auth_gate_ok: protected resource metadata");

  const asMeta = JSON.parse(
    curlJson(`${mcpOrigin}/.well-known/oauth-authorization-server`),
  ) as {
    issuer?: string;
    registration_endpoint?: string;
  };
  if (asMeta.issuer !== mcpOrigin) {
    throw new Error(
      `AS metadata issuer must be ${mcpOrigin} (RFC 8414), got ${JSON.stringify(asMeta.issuer)}.`,
    );
  }
  if (asMeta.registration_endpoint !== `${mcpOrigin}/register`) {
    throw new Error(
      `AS registration_endpoint must be ${mcpOrigin}/register, got ${JSON.stringify(asMeta.registration_endpoint)}.`,
    );
  }
  console.log("auth_gate_ok: authorization server metadata");

  // --- 2. client_credentials ---
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
  console.log("auth_gate_ok: client_credentials access token");

  // --- 3. Dual-era MCP matrix ---
  await assertLiveEra(serverUrl, accessToken, { mode: "legacy" }, "legacy");
  console.log("legacy_era_ok: listTools + profile + facts");

  await assertLiveEra(serverUrl, accessToken, { mode: { pin: "2026-07-28" } }, "modern");
  console.log("modern_era_ok: listTools + profile + facts");

  console.log("Candidate-mcp smoke test passed.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
