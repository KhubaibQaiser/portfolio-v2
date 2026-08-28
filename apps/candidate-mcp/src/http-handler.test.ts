import { describe, expect, it, vi } from "vitest";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
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

const KID = "test-key-1";

function setUp(configOverrides: Partial<Config> = {}) {
  const effectiveConfig = { ...config, ...configOverrides };
  const { publicKey, privateKey } = generateTestKeyPair();
  const cognitoVerifier = createCognitoVerifier(effectiveConfig);
  cognitoVerifier.cacheJwks(testJwks(publicKey, KID));
  const verifier = createAgentTokenVerifier(effectiveConfig, cognitoVerifier);
  const repo = createFixtureContentRepository();
  const handler = createHttpHandler({ config: effectiveConfig, repo, verifier });

  const { issuer } = CognitoJwtVerifier.parseUserPoolId(
    effectiveConfig.cognitoUserPoolId,
  );
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
 * Tests stamp Host because in-memory `Request` objects have none, and stamp
 * origin-verify because production CloudFront injects that header before the
 * Function URL. `toWebRequest` rewrites the Function URL Host to the public
 * custom-domain Host before this handler runs.
 */
function withHost(request: Request, originSecret = config.originVerifySecret): Request {
  request.headers.set("host", SERVER_HOST);
  if (originSecret) request.headers.set(ORIGIN_VERIFY_HEADER, originSecret);
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
    expect(challenge).toContain("resource_metadata=");
    expect(challenge).toMatch(
      /resource_metadata="https:\/\/mcp\.example\.com\/\.well-known\/oauth-protected-resource/,
    );
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

  it("rejects an invalid bearer with 401 invalid_token", async () => {
    const { handler } = setUp();

    const response = await handler(
      withHost(
        new Request(config.serverUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: "Bearer not-a-real-token",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {},
          }),
        }),
      ),
    );

    expect(response.status).toBe(401);
    const challenge = response.headers.get("www-authenticate");
    expect(challenge).toContain('error="invalid_token"');
  });

  it("serves RFC 9728 protected-resource metadata unauthenticated", async () => {
    const { handler } = setUp();

    const response = await handler(
      withHost(
        new Request("https://mcp.example.com/.well-known/oauth-protected-resource/mcp"),
      ),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      resource: string;
      scopes_supported: string[];
      authorization_servers: string[];
    };
    expect(body.resource).toBe(config.serverUrl);
    expect(body.scopes_supported).toContain(
      `${config.resourceServerIdentifier}/profile.read`,
    );
    expect(body.authorization_servers).toContain("https://mcp.example.com");
    expect(body.authorization_servers).not.toContain(
      `https://cognito-idp.${config.cognitoRegion}.amazonaws.com/${config.cognitoUserPoolId}`,
    );
  });

  it("answers 503 for every route when MCP_ENABLED is false (kill switch)", async () => {
    const { handler } = setUp({ enabled: false });

    const [mcpResponse, metadataResponse] = await Promise.all([
      handler(initializeRequest()),
      handler(
        withHost(
          new Request("https://mcp.example.com/.well-known/oauth-protected-resource/mcp"),
        ),
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
