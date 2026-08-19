import { beforeEach, describe, expect, it } from "vitest";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { createFixtureContentRepository } from "@portfolio/data";
import type { Config } from "./config";
import { createHttpHandler } from "./http-handler";
import { createAgentTokenVerifier, createCognitoVerifier } from "./auth/verify-agent-token";
import { generateTestKeyPair, signTestJwt, testJwks } from "./auth/test-jwt";
import { candidateProfileSchema } from "./schemas/candidate-profile";

const config: Config = {
  serverUrl: "https://mcp.example.com/mcp",
  cognitoUserPoolId: "eu-west-1_TestPool123",
  cognitoRegion: "eu-west-1",
  resourceServerIdentifier: "https://mcp.example.com",
  cognitoDomain: "test-domain",
  enabled: true,
  rateLimitMax: 30,
  rateLimitWindowSec: 60,
};

const KID = "test-key-1";

function setUp(configOverrides: Partial<Config> = {}) {
  const effectiveConfig = { ...config, ...configOverrides };
  const { publicKey, privateKey } = generateTestKeyPair();
  const cognitoVerifier = createCognitoVerifier(effectiveConfig);
  cognitoVerifier.cacheJwks(testJwks(publicKey, KID));
  const verifier = createAgentTokenVerifier(effectiveConfig, cognitoVerifier);
  const repo = createFixtureContentRepository();
  const handler = createHttpHandler({ config: effectiveConfig, repo, verifier });

  const { issuer } = CognitoJwtVerifier.parseUserPoolId(effectiveConfig.cognitoUserPoolId);
  const now = Math.floor(Date.now() / 1000);
  const validToken = signTestJwt(
    {
      sub: "n8n-workflow",
      client_id: "n8n-workflow",
      token_use: "access",
      scope: `${effectiveConfig.resourceServerIdentifier}/profile.read`,
      iss: issuer,
      iat: now,
      auth_time: now,
      exp: now + 3600,
      jti: "22222222-2222-2222-2222-222222222222",
    },
    privateKey,
    KID,
  );

  return { handler, validToken };
}

const SERVER_HOST = new URL(config.serverUrl).host;

/**
 * `Request` objects built in-memory (unlike real HTTP requests received by
 * Node/Lambda) never carry a `Host` header, so DNS-rebinding protection in
 * `createHttpHandler` would reject every test request. Real traffic gets its
 * `Host` header from the transport (see `lambda.ts`'s `toWebRequest`); tests
 * fill it in here.
 */
function withHost(request: Request): Request {
  request.headers.set("host", SERVER_HOST);
  return request;
}

function initializeRequest(): Request {
  return withHost(
    new Request(config.serverUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
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
  );
}

describe("createHttpHandler", () => {
  it("rejects an unauthenticated request with 401 and a WWW-Authenticate challenge", async () => {
    const { handler } = setUp();

    const response = await handler(initializeRequest());

    expect(response.status).toBe(401);
    const challenge = response.headers.get("www-authenticate");
    expect(challenge).toContain("Bearer");
    expect(challenge).toContain("resource_metadata");
  });

  it("rejects a request with an invalid bearer token", async () => {
    const { handler } = setUp();

    const response = await handler(
      withHost(
        new Request(config.serverUrl, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: "Bearer not-a-real-token" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
        }),
      ),
    );

    expect(response.status).toBe(401);
  });

  it("serves RFC 9728 protected-resource metadata unauthenticated", async () => {
    const { handler } = setUp();

    const response = await handler(
      withHost(new Request("https://mcp.example.com/.well-known/oauth-protected-resource/mcp")),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { resource: string; scopes_supported: string[] };
    expect(body.resource).toBe(config.serverUrl);
    expect(body.scopes_supported).toContain(`${config.resourceServerIdentifier}/profile.read`);
  });

  it("answers 503 for every route when MCP_ENABLED is false (kill switch)", async () => {
    const { handler } = setUp({ enabled: false });

    const [mcpResponse, metadataResponse] = await Promise.all([
      handler(initializeRequest()),
      handler(
        withHost(new Request("https://mcp.example.com/.well-known/oauth-protected-resource/mcp")),
      ),
    ]);

    expect(mcpResponse.status).toBe(503);
    expect(metadataResponse.status).toBe(503);
  });

  it("serves a schema-valid get_candidate_profile response for an authenticated, correctly-scoped caller", async () => {
    const { handler, validToken } = setUp();

    const transport = new StreamableHTTPClientTransport(new URL(config.serverUrl), {
      fetch: (async (input: string | URL | Request, init?: RequestInit) =>
        handler(withHost(new Request(input, init)))) as typeof fetch,
      authProvider: { token: async () => validToken },
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
