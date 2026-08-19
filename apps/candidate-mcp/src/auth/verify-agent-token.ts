import { CognitoJwtVerifier } from "aws-jwt-verify";
import type { CognitoJwtVerifierSingleUserPool } from "aws-jwt-verify/cognito-verifier";
import { OAuthError, OAuthErrorCode, type AuthInfo, type OAuthTokenVerifier } from "@modelcontextprotocol/server";
import type { Config } from "../config";
import { profileReadScope } from "../config";

/**
 * Builds the underlying `aws-jwt-verify` Cognito verifier for this server's
 * user pool and required scope. Split out from {@link createAgentTokenVerifier}
 * so tests can construct one, preload it with a test JWKS via `.cacheJwks()`
 * (no network JWKS fetch), and drive it through the same wrapping logic —
 * see `verify-agent-token.test.ts`.
 */
export function createCognitoVerifier(
  config: Config,
): CognitoJwtVerifierSingleUserPool<{
  userPoolId: string;
  tokenUse: "access";
  clientId: null;
  scope: string;
}> {
  return CognitoJwtVerifier.create({
    userPoolId: config.cognitoUserPoolId,
    tokenUse: "access",
    clientId: null,
    scope: profileReadScope(config),
  });
}

/**
 * Builds the MCP SDK's {@link OAuthTokenVerifier} on top of `aws-jwt-verify`'s
 * `CognitoJwtVerifier` — the AWS-maintained library purpose-built for
 * verifying Cognito-issued JWTs (cached JWKS, RS256 pinned, issuer/`exp`/
 * `token_use` checks). See ADR 0003 §1.
 *
 * `clientId: null` opts out of pinning to one specific Cognito app client:
 * any app client provisioned under this user pool with the `profile.read`
 * scope may call this server, which is the point of provisioning a new
 * consumer (n8n today, Apify later) as a Cognito app client rather than a
 * code change. The scope check below is what actually authorizes the call.
 */
export function createAgentTokenVerifier(
  config: Config,
  verifier: Pick<
    CognitoJwtVerifierSingleUserPool<{
      userPoolId: string;
      tokenUse: "access";
      clientId: null;
      scope: string;
    }>,
    "verify"
  > = createCognitoVerifier(config),
): OAuthTokenVerifier {
  return {
    async verifyAccessToken(token: string): Promise<AuthInfo> {
      let payload;
      try {
        payload = await verifier.verify(token);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Token verification failed";
        throw new OAuthError(OAuthErrorCode.InvalidToken, message);
      }

      const clientId = payload.client_id;
      if (typeof clientId !== "string" || clientId.length === 0) {
        throw new OAuthError(
          OAuthErrorCode.InvalidToken,
          "Access token is missing a client_id claim",
        );
      }

      const scopeClaim = typeof payload.scope === "string" ? payload.scope : "";
      const scopes = scopeClaim.split(" ").filter(Boolean);

      return {
        token,
        clientId,
        scopes,
        expiresAt: payload.exp,
        resource: new URL(config.serverUrl),
      };
    },
  };
}
