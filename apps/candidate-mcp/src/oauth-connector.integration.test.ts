/**
 * Connector-add contract suite: drives the real HTTP handler in-memory to
 * mimic MCP Authorization discovery + DCR + Bearer for any interactive or
 * M2M client (Inspector, Claude, n8n, SDKs)—not a single vendor UI.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
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
import { ORIGIN_VERIFY_HEADER } from "./origin-verify";
import { discoveredAuthorizationServerIssuer } from "./oauth-metadata";

const cognitoSend = vi.hoisted(() => vi.fn());

vi.mock("@aws-sdk/client-cognito-identity-provider", () => {
  class CreateUserPoolClientCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  class CognitoIdentityProviderClient {
    send = cognitoSend;
  }
  return { CreateUserPoolClientCommand, CognitoIdentityProviderClient };
});

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

const MCP_ORIGIN = discoveredAuthorizationServerIssuer(config);
const SERVER_HOST = new URL(config.serverUrl).host;
const KID = "test-key-1";
const COGNITO_ISSUER = `https://cognito-idp.${config.cognitoRegion}.amazonaws.com/${config.cognitoUserPoolId}`;

function setUp(configOverrides: Partial<Config> = {}) {
  const effectiveConfig = { ...config, ...configOverrides };
  const { publicKey, privateKey } = generateTestKeyPair();
  const cognitoVerifier = createCognitoVerifier(effectiveConfig);
  cognitoVerifier.cacheJwks(testJwks(publicKey, KID));
  const verifier = createAgentTokenVerifier(effectiveConfig, cognitoVerifier);
  const repo = createFixtureContentRepository();
  const handler = createHttpHandler({
    config: effectiveConfig,
    repo,
    verifier,
  });

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
      jti: "33333333-3333-3333-3333-333333333333",
    },
    privateKey,
    KID,
  );

  return { handler, validToken, effectiveConfig };
}

function withHost(
  request: Request,
  originSecret: string | null = config.originVerifySecret,
): Request {
  request.headers.set("host", SERVER_HOST);
  if (originSecret) request.headers.set(ORIGIN_VERIFY_HEADER, originSecret);
  return request;
}

function initializeRequest(): Request {
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
          clientInfo: { name: "connector-sim", version: "1.0.0" },
        },
      }),
    }),
  );
}

beforeEach(() => {
  cognitoSend.mockReset();
  cognitoSend.mockResolvedValue({
    UserPoolClient: { ClientId: "dcr-client-abc" },
  });
});

describe("oauth connector integration — discovery ladder", () => {
  it("challenges unauthenticated MCP with absolute resource_metadata", async () => {
    const { handler } = setUp();
    const response = await handler(initializeRequest());

    expect(response.status).toBe(401);
    const challenge = response.headers.get("www-authenticate");
    expect(challenge).toContain("Bearer");
    expect(challenge).toMatch(
      /resource_metadata="https:\/\/mcp\.example\.com\/\.well-known\/oauth-protected-resource/,
    );
  });

  it("serves path-aware PRM with MCP origin as authorization_servers (not Cognito pool)", async () => {
    const { handler } = setUp();

    const response = await handler(
      withHost(new Request(`${MCP_ORIGIN}/.well-known/oauth-protected-resource/mcp`)),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      resource: string;
      authorization_servers: string[];
    };
    expect(body.resource).toBe(config.serverUrl);
    expect(body.authorization_servers).toContain(MCP_ORIGIN);
    expect(body.authorization_servers).not.toContain(COGNITO_ISSUER);

    // Root PRM may be served or fall through depending on SDK path reflection.
    const root = await handler(
      withHost(new Request(`${MCP_ORIGIN}/.well-known/oauth-protected-resource`)),
    );
    if (root.status === 200) {
      const rootBody = (await root.json()) as { authorization_servers: string[] };
      expect(rootBody.authorization_servers).toContain(MCP_ORIGIN);
      expect(rootBody.authorization_servers).not.toContain(COGNITO_ISSUER);
    }
  });

  it("serves AS metadata with issuer exactly equal to MCP origin (RFC 8414 §3.3)", async () => {
    const { handler } = setUp();
    const response = await handler(
      withHost(new Request(`${MCP_ORIGIN}/.well-known/oauth-authorization-server`)),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      issuer: string;
      registration_endpoint: string;
      authorization_endpoint: string;
      token_endpoint: string;
      code_challenge_methods_supported?: string[];
      grant_types_supported?: string[];
    };
    expect(body.issuer).toBe(MCP_ORIGIN);
    expect(body.issuer.endsWith("/")).toBe(false);
    expect(body.registration_endpoint).toBe(`${MCP_ORIGIN}/register`);
    expect(body.authorization_endpoint).toContain("amazoncognito.com/oauth2/authorize");
    expect(body.token_endpoint).toContain("amazoncognito.com/oauth2/token");
    expect(body.code_challenge_methods_supported).toContain("S256");
    expect(body.grant_types_supported).toEqual(
      expect.arrayContaining(["authorization_code", "client_credentials"]),
    );
  });

  it("OIDC discovery probe either shares MCP issuer or is not served", async () => {
    const { handler } = setUp();
    const response = await handler(
      withHost(new Request(`${MCP_ORIGIN}/.well-known/openid-configuration`)),
    );

    if (response.status === 200) {
      const body = (await response.json()) as { issuer: string };
      expect(body.issuer).toBe(MCP_ORIGIN);
    } else {
      // SDK may not map this path; connector then uses oauth-authorization-server.
      expect([404, 401]).toContain(response.status);
    }
  });
});

describe("oauth connector integration — DCR", () => {
  it("registers Claude-shaped public client", async () => {
    const { handler } = setUp();
    const response = await handler(
      withHost(
        new Request(`${MCP_ORIGIN}/register`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
            token_endpoint_auth_method: "none",
            grant_types: ["authorization_code", "refresh_token"],
            response_types: ["code"],
            client_name: "Claude",
            application_type: "native",
            scope: "",
          }),
        }),
      ),
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      client_id: string;
      token_endpoint_auth_method: string;
    };
    expect(body.client_id).toBe("dcr-client-abc");
    expect(body.token_endpoint_auth_method).toBe("none");
    expect(cognitoSend).toHaveBeenCalledTimes(1);
  });

  it("registers Inspector loopback redirect", async () => {
    const { handler } = setUp();
    const response = await handler(
      withHost(
        new Request(`${MCP_ORIGIN}/register`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            redirect_uris: ["http://127.0.0.1:6274/oauth/callback"],
            token_endpoint_auth_method: "none",
            client_name: "MCP Inspector",
          }),
        }),
      ),
    );
    expect(response.status).toBe(201);
  });

  it("rejects non-allowlisted redirects", async () => {
    const { handler } = setUp();
    const response = await handler(
      withHost(
        new Request(`${MCP_ORIGIN}/register`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            redirect_uris: ["https://evil.example/cb"],
            token_endpoint_auth_method: "none",
          }),
        }),
      ),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("invalid_redirect_uri");
    expect(cognitoSend).not.toHaveBeenCalled();
  });

  it("rejects confidential token_endpoint_auth_method", async () => {
    const { handler } = setUp();
    const response = await handler(
      withHost(
        new Request(`${MCP_ORIGIN}/register`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            redirect_uris: ["http://localhost:6274/oauth/callback"],
            token_endpoint_auth_method: "client_secret_basic",
          }),
        }),
      ),
    );
    expect(response.status).toBe(400);
  });

  it("rejects grant_types that omit authorization_code", async () => {
    const { handler } = setUp();
    const response = await handler(
      withHost(
        new Request(`${MCP_ORIGIN}/register`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            redirect_uris: ["http://localhost:6274/oauth/callback"],
            token_endpoint_auth_method: "none",
            grant_types: ["client_credentials"],
          }),
        }),
      ),
    );
    expect(response.status).toBe(400);
  });

  it("returns safe 500 when Cognito create fails", async () => {
    cognitoSend.mockRejectedValueOnce(new Error("AccessDenied"));
    const { handler } = setUp();
    const response = await handler(
      withHost(
        new Request(`${MCP_ORIGIN}/register`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            redirect_uris: ["https://claude.com/api/mcp/auth_callback"],
            token_endpoint_auth_method: "none",
          }),
        }),
      ),
    );
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).not.toMatch(/AccessDenied|secret/i);
    expect(JSON.parse(text)).toMatchObject({ error: "server_error" });
  });

  it("does not treat GET /register as DCR", async () => {
    const { handler } = setUp();
    const response = await handler(
      withHost(new Request(`${MCP_ORIGIN}/register`, { method: "GET" })),
    );
    expect(response.status).toBe(401);
    expect(cognitoSend).not.toHaveBeenCalled();
  });
});

describe("oauth connector integration — auth gate and M2M regression", () => {
  it("rejects invalid bearer with invalid_token", async () => {
    const { handler } = setUp();
    const response = await handler(
      withHost(
        new Request(config.serverUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: "Bearer not-a-jwt",
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
    expect(response.headers.get("www-authenticate")).toContain('error="invalid_token"');
  });

  it("accepts Cognito-issued access tokens after facade discovery", async () => {
    const { handler, validToken } = setUp();
    const transport = new StreamableHTTPClientTransport(new URL(config.serverUrl), {
      fetch: (async (input: string | URL | Request, init?: RequestInit) =>
        handler(withHost(new Request(input, init)))) as typeof fetch,
      authProvider: { token: async () => validToken },
    });
    const client = new Client({ name: "m2m-sim", version: "1.0.0" });
    try {
      await client.connect(transport);
      const tools = await client.listTools();
      expect(tools.tools.some((t) => t.name === "get_candidate_profile")).toBe(true);
    } finally {
      await client.close();
    }
  });

  it("kill switch returns 503 for MCP and PRM", async () => {
    const { handler } = setUp({ enabled: false });
    const mcp = await handler(initializeRequest());
    const prm = await handler(
      withHost(new Request(`${MCP_ORIGIN}/.well-known/oauth-protected-resource/mcp`)),
    );
    expect(mcp.status).toBe(503);
    expect(prm.status).toBe(503);
  });

  it("rejects missing origin-verify and wrong Host", async () => {
    const { handler } = setUp();
    const noVerify = initializeRequest();
    noVerify.headers.delete(ORIGIN_VERIFY_HEADER);
    expect((await handler(noVerify)).status).toBe(403);

    const badHost = initializeRequest();
    badHost.headers.set("host", "abc.lambda-url.eu-west-1.on.aws");
    expect((await handler(badHost)).status).toBe(403);
  });

  it("allows CORS preflight from allowlisted Origin without Bearer", async () => {
    const { handler } = setUp();
    const response = await handler(
      withHost(
        new Request(config.serverUrl, {
          method: "OPTIONS",
          headers: {
            origin: "https://claude.ai",
            "access-control-request-method": "POST",
          },
        }),
      ),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://claude.ai");
  });

  it("denies CORS preflight from unknown Origin", async () => {
    const { handler } = setUp();
    const response = await handler(
      withHost(
        new Request(config.serverUrl, {
          method: "OPTIONS",
          headers: { origin: "https://evil.example" },
        }),
      ),
    );
    expect(response.status).toBe(403);
  });
});
