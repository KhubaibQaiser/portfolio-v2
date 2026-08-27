import { describe, expect, it, vi } from "vitest";
import {
  handleDynamicClientRegistration,
  isAllowedRedirectUri,
  isDcrRegistrationRequest,
} from "./dcr";
import type { Config } from "../config";

const config: Config = {
  serverUrl: "https://mcp.example.com/mcp",
  cognitoUserPoolId: "eu-west-1_TestPool123",
  cognitoRegion: "eu-west-1",
  resourceServerIdentifier: "https://mcp.example.com",
  cognitoDomain: "test-domain",
  enabled: true,
  ipRateLimitMax: 60,
  ipRateLimitWindowSec: 60,
  rateLimitMax: 30,
  rateLimitWindowSec: 60,
  originVerifySecret: "secret",
};

describe("isAllowedRedirectUri", () => {
  it("allows Claude and loopback prefixes", () => {
    expect(isAllowedRedirectUri("https://claude.ai/api/mcp/auth_callback")).toBe(true);
    expect(isAllowedRedirectUri("https://claude.com/api/mcp/auth_callback")).toBe(true);
    expect(isAllowedRedirectUri("http://127.0.0.1:6274/oauth/callback")).toBe(true);
    expect(isAllowedRedirectUri("http://localhost:6274/oauth/callback")).toBe(true);
  });

  it("rejects non-allowlisted redirects", () => {
    expect(isAllowedRedirectUri("https://evil.example/callback")).toBe(false);
    expect(isAllowedRedirectUri("https://claude.ai.evil.com/callback")).toBe(false);
  });
});

describe("isDcrRegistrationRequest", () => {
  it("matches POST /register on the MCP host", () => {
    const serverUrl = new URL(config.serverUrl);
    expect(
      isDcrRegistrationRequest(
        new Request("https://mcp.example.com/register", { method: "POST" }),
        serverUrl,
      ),
    ).toBe(true);
    expect(
      isDcrRegistrationRequest(
        new Request("https://mcp.example.com/register", { method: "GET" }),
        serverUrl,
      ),
    ).toBe(false);
  });
});

describe("handleDynamicClientRegistration", () => {
  it("rejects a bad redirect URI", async () => {
    const result = await handleDynamicClientRegistration(
      new Request("https://mcp.example.com/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          redirect_uris: ["https://attacker.example/cb"],
          token_endpoint_auth_method: "none",
        }),
      }),
      config,
      { send: vi.fn() },
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.body.error).toBe("invalid_redirect_uri");
  });

  it("creates a Cognito public client for an allowlisted redirect", async () => {
    const send = vi.fn().mockResolvedValue({
      UserPoolClient: { ClientId: "dcr-client-123" },
    });

    const result = await handleDynamicClientRegistration(
      new Request("https://mcp.example.com/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          redirect_uris: ["http://127.0.0.1:6274/oauth/callback"],
          token_endpoint_auth_method: "none",
          client_name: "mcp-inspector",
        }),
      }),
      config,
      { send },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe(201);
    expect(result.body.client_id).toBe("dcr-client-123");
    expect(result.body.token_endpoint_auth_method).toBe("none");
    expect(send).toHaveBeenCalledTimes(1);
  });
});
