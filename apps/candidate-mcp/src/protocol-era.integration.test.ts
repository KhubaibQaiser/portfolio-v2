/**
 * Protocol-era matrix: proves createMcpHandler dual-serve for legacy
 * (initialize / 2025-era) and modern (pinned 2026-07-28) clients.
 */
import { describe, expect, it, vi } from "vitest";
import {
  Client,
  StreamableHTTPClientTransport,
  type ClientOptions,
  type ProtocolEra,
} from "@modelcontextprotocol/client";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { createFixtureContentRepository } from "@portfolio/data";
import type { Config } from "./config";
import { createHttpHandler } from "./http-handler";
import {
  createAgentTokenVerifier,
  createCognitoVerifier,
} from "./auth/verify-agent-token";
import { generateTestKeyPair, signTestJwt, testJwks } from "./auth/test-jwt";
import { candidateProfileSchema } from "./schemas/candidate-profile";
import { ORIGIN_VERIFY_HEADER } from "./origin-verify";

vi.mock("./ip-rate-limit", () => ({
  checkIpRateLimit: vi.fn(async () => ({ ok: true })),
}));

const config: Config = {
  serverUrl: "https://mcp.example.com/mcp",
  cognitoUserPoolId: "eu-west-1_TestPool123",
  cognitoRegion: "eu-west-1",
  resourceServerIdentifier: "https://mcp.example.com",
  cognitoDomain: "test-domain",
  enabled: true,
  ipRateLimitMax: 1000,
  ipRateLimitWindowSec: 60,
  rateLimitMax: 30,
  rateLimitWindowSec: 60,
  originVerifySecret: "test-origin-verify-secret",
};

const SERVER_HOST = new URL(config.serverUrl).host;
const KID = "era-test-key-1";

type Handler = (request: Request) => Promise<Response>;

function withHost(request: Request, originSecret = config.originVerifySecret): Request {
  request.headers.set("host", SERVER_HOST);
  if (originSecret) request.headers.set(ORIGIN_VERIFY_HEADER, originSecret);
  return request;
}

function setUp(clientId: string) {
  const { publicKey, privateKey } = generateTestKeyPair();
  const cognitoVerifier = createCognitoVerifier(config);
  cognitoVerifier.cacheJwks(testJwks(publicKey, KID));
  const verifier = createAgentTokenVerifier(config, cognitoVerifier);
  const repo = createFixtureContentRepository();
  const handler = createHttpHandler({ config, repo, verifier });

  const { issuer } = CognitoJwtVerifier.parseUserPoolId(config.cognitoUserPoolId);
  const now = Math.floor(Date.now() / 1000);
  const validToken = signTestJwt(
    {
      sub: clientId,
      client_id: clientId,
      token_use: "access",
      scope: `${config.resourceServerIdentifier}/profile.read`,
      iss: issuer,
      iat: now,
      auth_time: now,
      exp: now + 3600,
      jti: crypto.randomUUID(),
    },
    privateKey,
    KID,
  );

  return { handler, validToken };
}

async function connectEra(
  handler: Handler,
  token: string,
  versionNegotiation: ClientOptions["versionNegotiation"],
  clientName: string,
): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(new URL(config.serverUrl), {
    fetch: (async (input: string | URL | Request, init?: RequestInit) =>
      handler(withHost(new Request(input, init)))) as typeof fetch,
    authProvider: { token: async () => token },
    onInsufficientScope: "throw",
  });
  const client = new Client(
    { name: clientName, version: "1.0.0" },
    versionNegotiation === undefined ? undefined : { versionNegotiation },
  );
  await client.connect(transport);
  return client;
}

function textFromToolResult(result: {
  isError?: boolean;
  content: Array<{ type: string; text?: string }>;
}): string {
  expect(result.isError).toBeFalsy();
  const textPart = result.content.find((c) => c.type === "text");
  expect(textPart?.text).toEqual(expect.any(String));
  return textPart!.text!;
}

async function assertEraTools(client: Client, expectedEra: ProtocolEra): Promise<void> {
  expect(client.getProtocolEra()).toBe(expectedEra);

  const tools = await client.listTools();
  const names = tools.tools.map((t) => t.name);
  expect(names).toEqual(
    expect.arrayContaining(["get_candidate_profile", "get_candidate_facts"]),
  );

  const profileResult = await client.callTool({ name: "get_candidate_profile" });
  const profileJson = textFromToolResult(profileResult);
  const parsed: unknown = JSON.parse(profileJson);
  expect(candidateProfileSchema.safeParse(parsed).success).toBe(true);

  const factsResult = await client.callTool({ name: "get_candidate_facts" });
  const factsText = textFromToolResult(factsResult);
  expect(factsText.trim().length).toBeGreaterThan(0);
}

describe("protocol era dual-serve", () => {
  it("serves the legacy initialize path", async () => {
    const { handler, validToken } = setUp("era-legacy");
    const client = await connectEra(
      handler,
      validToken,
      { mode: "legacy" },
      "era-legacy-client",
    );
    try {
      await assertEraTools(client, "legacy");
    } finally {
      await client.close();
    }
  });

  it("serves the modern 2026-07-28 path when pinned", async () => {
    const { handler, validToken } = setUp("era-modern");
    const client = await connectEra(
      handler,
      validToken,
      { mode: { pin: "2026-07-28" } },
      "era-modern-client",
    );
    try {
      await assertEraTools(client, "modern");
    } finally {
      await client.close();
    }
  });

  it("defaults to legacy when versionNegotiation is omitted", async () => {
    const { handler, validToken } = setUp("era-default");
    const client = await connectEra(handler, validToken, undefined, "era-default-client");
    try {
      expect(client.getProtocolEra()).toBe("legacy");
      const result = await client.callTool({ name: "get_candidate_profile" });
      const profileJson = textFromToolResult(result);
      expect(candidateProfileSchema.safeParse(JSON.parse(profileJson)).success).toBe(true);
    } finally {
      await client.close();
    }
  });
});
