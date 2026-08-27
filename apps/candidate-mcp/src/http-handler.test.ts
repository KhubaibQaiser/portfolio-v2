import { describe, expect, it } from "vitest";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import {
  createFixtureContentRepository,
  createMemoryMcpApiKeyStore,
} from "@portfolio/data";
import type { Config } from "./config";
import { createHttpHandler } from "./http-handler";
import { candidateProfileSchema } from "./schemas/candidate-profile";
import { ORIGIN_VERIFY_HEADER } from "./origin-verify";

const config: Config = {
  serverUrl: "https://mcp.example.com/mcp",
  enabled: true,
  ipRateLimitMax: 1000,
  ipRateLimitWindowSec: 60,
  rateLimitMax: 30,
  rateLimitWindowSec: 60,
  smokeTestRateLimitMax: 10,
  smokeTestRateLimitWindowSec: 60,
  smokeTestKeySecretArn: null,
  originVerifySecret: "test-origin-verify-secret",
};

function setUp(configOverrides: Partial<Config> = {}) {
  const effectiveConfig = { ...config, ...configOverrides };
  const keyStore = createMemoryMcpApiKeyStore();
  const repo = createFixtureContentRepository();
  let apiKey = "";

  const handler = createHttpHandler({
    config: effectiveConfig,
    repo,
    keyStore,
  });

  return {
    handler,
    keyStore,
    async createKey(name = "test-client") {
      const result = await keyStore.createKey({
        name,
        rateLimitMax: 30,
        rateLimitWindowSec: 60,
      });
      apiKey = result.key;
      return result;
    },
    get apiKey() {
      return apiKey;
    },
  };
}

const SERVER_HOST = new URL(config.serverUrl).host;

function withHost(
  request: Request,
  originSecret = config.originVerifySecret,
  bearer?: string,
): Request {
  request.headers.set("host", SERVER_HOST);
  if (originSecret) request.headers.set(ORIGIN_VERIFY_HEADER, originSecret);
  if (bearer) request.headers.set("authorization", `Bearer ${bearer}`);
  return request;
}

function initializeRequest(bearer?: string): Request {
  return withHost(
    new Request(config.serverUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" },
        },
      }),
    }),
    config.originVerifySecret,
    bearer,
  );
}

describe("createHttpHandler", () => {
  it("rejects an unauthenticated request with 401 JSON (no OAuth challenge)", async () => {
    const { handler } = setUp();

    const response = await handler(initializeRequest());

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBeNull();
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("unauthorized");
  });

  it("rejects a Function URL Host that is not the public hostname", async () => {
    const { handler } = setUp();
    const request = initializeRequest();
    request.headers.set("host", "abc123.lambda-url.eu-west-1.on.aws");

    const response = await handler(request);

    expect(response.status).toBe(403);
  });

  it("rejects a request that did not come through CloudFront (missing origin-verify)", async () => {
    const { handler } = setUp();
    const request = initializeRequest();
    request.headers.delete(ORIGIN_VERIFY_HEADER);

    const response = await handler(request);

    expect(response.status).toBe(403);
  });

  it("rejects a request with an invalid bearer token", async () => {
    const { handler } = setUp();

    const response = await handler(initializeRequest("not-a-real-token"));

    expect(response.status).toBe(401);
  });

  it("answers 503 when MCP_ENABLED is false (kill switch)", async () => {
    const { handler } = setUp({ enabled: false });

    const response = await handler(initializeRequest());

    expect(response.status).toBe(503);
  });

  it("accepts Claude.ai Origin with a valid API key", async () => {
    const setup = setUp();
    await setup.createKey("claude-ai");
    const request = initializeRequest(setup.apiKey);
    request.headers.set("origin", "https://claude.ai");

    const response = await setup.handler(request);

    expect(response.status).toBe(200);
  });

  it("rejects an unknown browser Origin even with a valid API key", async () => {
    const setup = setUp();
    await setup.createKey("claude-ai");
    const request = initializeRequest(setup.apiKey);
    request.headers.set("origin", "https://evil.example");

    const response = await setup.handler(request);

    expect(response.status).toBe(403);
  });

  it("serves a schema-valid get_candidate_profile response for a valid API key", async () => {
    const setup = setUp();
    await setup.createKey();
    const { handler, apiKey } = setup;

    const transport = new StreamableHTTPClientTransport(new URL(config.serverUrl), {
      fetch: (async (input: string | URL | Request, init?: RequestInit) =>
        handler(
          withHost(new Request(input, init), config.originVerifySecret, apiKey),
        )) as typeof fetch,
      authProvider: { token: async () => apiKey },
    });
    const client = new Client({ name: "test-client", version: "1.0.0" });

    try {
      await client.connect(transport);
      const result = await client.callTool({ name: "get_candidate_profile" });

      expect(result.isError).toBeFalsy();
      const [content] = result.content;
      expect(content?.type).toBe("text");
      const profile = JSON.parse((content as { text: string }).text);
      expect(() => candidateProfileSchema.parse(profile)).not.toThrow();
    } finally {
      await client.close();
    }
  });
});
