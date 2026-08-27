import { CognitoJwtVerifier } from "aws-jwt-verify";
import type { CognitoJwtVerifierSingleUserPool } from "aws-jwt-verify/cognito-verifier";
import {
  OAuthError,
  OAuthErrorCode,
  type AuthInfo,
  type OAuthTokenVerifier,
} from "@modelcontextprotocol/server";
import type { Config } from "../config";
import { profileReadScope } from "../config";

/**
 * Builds the underlying `aws-jwt-verify` Cognito verifier for this server's
 * user pool and required scope. Split out from {@link createAgentTokenVerifier}
 * so tests can preload JWKS via `.cacheJwks()` without a network fetch.
 */
export function createCognitoVerifier(config: Config): CognitoJwtVerifierSingleUserPool<{
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
 * MCP SDK {@link OAuthTokenVerifier} over Cognito access tokens.
 * `clientId: null` accepts any app client in the pool that was granted
 * `profile.read` (n8n M2M, Claude PKCE, DCR-registered Inspector clients).
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
        const message =
          error instanceof Error ? error.message : "Token verification failed";
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
