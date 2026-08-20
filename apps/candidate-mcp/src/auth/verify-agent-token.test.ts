import { describe, expect, it } from "vitest";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { OAuthError, OAuthErrorCode } from "@modelcontextprotocol/server";
import type { Config } from "../config";
import { createAgentTokenVerifier, createCognitoVerifier } from "./verify-agent-token";
import { generateTestKeyPair, signTestJwt, testJwks } from "./test-jwt";

const config: Config = {
  serverUrl: "https://mcp.example.com/mcp",
  cognitoUserPoolId: "eu-west-1_TestPool123",
  cognitoRegion: "eu-west-1",
  resourceServerIdentifier: "https://mcp.example.com",
  cognitoDomain: "test-domain",
  enabled: true,
  rateLimitMax: 30,
  rateLimitWindowSec: 60,
  originVerifySecret: null,
};

const REQUIRED_SCOPE = "https://mcp.example.com/profile.read";
const { issuer } = CognitoJwtVerifier.parseUserPoolId(config.cognitoUserPoolId);
const KID = "test-key-1";

function setUpVerifier() {
  const { publicKey, privateKey } = generateTestKeyPair();
  const cognitoVerifier = createCognitoVerifier(config);
  cognitoVerifier.cacheJwks(testJwks(publicKey, KID));
  const verifier = createAgentTokenVerifier(config, cognitoVerifier);
  return { verifier, privateKey };
}

function basePayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: "test-client-id",
    client_id: "test-client-id",
    token_use: "access",
    scope: REQUIRED_SCOPE,
    iss: issuer,
    iat: now,
    auth_time: now,
    exp: now + 3600,
    jti: "11111111-1111-1111-1111-111111111111",
    ...overrides,
  };
}

describe("createAgentTokenVerifier", () => {
  it("accepts a valid, correctly-scoped access token and returns AuthInfo", async () => {
    const { verifier, privateKey } = setUpVerifier();
    const token = signTestJwt(basePayload(), privateKey, KID);

    const authInfo = await verifier.verifyAccessToken(token);

    expect(authInfo.clientId).toBe("test-client-id");
    expect(authInfo.scopes).toContain(REQUIRED_SCOPE);
    expect(authInfo.expiresAt).toBeTypeOf("number");
    expect(authInfo.token).toBe(token);
  });

  it("rejects an expired token", async () => {
    const { verifier, privateKey } = setUpVerifier();
    const now = Math.floor(Date.now() / 1000);
    const token = signTestJwt(basePayload({ exp: now - 60 }), privateKey, KID);

    await expect(verifier.verifyAccessToken(token)).rejects.toSatisfy(
      (err) => err instanceof OAuthError && err.code === OAuthErrorCode.InvalidToken,
    );
  });

  it("rejects a token issued by a different (wrong-issuer) user pool", async () => {
    const { verifier, privateKey } = setUpVerifier();
    const token = signTestJwt(
      basePayload({
        iss: "https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_OtherPool999",
      }),
      privateKey,
      KID,
    );

    await expect(verifier.verifyAccessToken(token)).rejects.toBeInstanceOf(OAuthError);
  });

  it("rejects an ID token (wrong token_use) even though otherwise valid", async () => {
    const { verifier, privateKey } = setUpVerifier();
    const token = signTestJwt(basePayload({ token_use: "id" }), privateKey, KID);

    await expect(verifier.verifyAccessToken(token)).rejects.toBeInstanceOf(OAuthError);
  });

  it("rejects a token missing the required profile.read scope", async () => {
    const { verifier, privateKey } = setUpVerifier();
    const token = signTestJwt(
      basePayload({ scope: "https://mcp.example.com/other.scope" }),
      privateKey,
      KID,
    );

    await expect(verifier.verifyAccessToken(token)).rejects.toBeInstanceOf(OAuthError);
  });

  it("rejects a token missing the client_id claim", async () => {
    const { verifier, privateKey } = setUpVerifier();
    const payload = basePayload();
    delete payload.client_id;
    const token = signTestJwt(payload, privateKey, KID);

    await expect(verifier.verifyAccessToken(token)).rejects.toSatisfy(
      (err) => err instanceof OAuthError && err.code === OAuthErrorCode.InvalidToken,
    );
  });

  it("rejects a malformed token", async () => {
    const { verifier } = setUpVerifier();

    await expect(verifier.verifyAccessToken("not-a-jwt")).rejects.toBeInstanceOf(
      OAuthError,
    );
  });

  it("rejects an unsigned (alg: none) token — algorithm-confusion attempt", async () => {
    const { verifier } = setUpVerifier();
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
      "base64url",
    );
    const payload = Buffer.from(JSON.stringify(basePayload())).toString("base64url");
    const token = `${header}.${payload}.`;

    await expect(verifier.verifyAccessToken(token)).rejects.toBeInstanceOf(OAuthError);
  });

  it("rejects a token with a tampered signature", async () => {
    const { verifier, privateKey } = setUpVerifier();
    const token = signTestJwt(basePayload(), privateKey, KID);
    const tampered = token.slice(0, -4) + "abcd";

    await expect(verifier.verifyAccessToken(tampered)).rejects.toBeInstanceOf(OAuthError);
  });
});
