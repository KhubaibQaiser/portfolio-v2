import type { AuthMetadataOptions } from "@modelcontextprotocol/server";
import type { Config } from "./config";
import { profileReadScope } from "./config";

/**
 * Discovered OAuth authorization server issuer (RFC 8414): the MCP public
 * origin. Clients fetch AS metadata from this issuer and require an exact
 * `issuer` match. Cognito remains the login/token backend; its user-pool URL
 * is not the discovered AS (access-token `iss` still comes from Cognito).
 */
export function discoveredAuthorizationServerIssuer(
  config: Pick<Config, "serverUrl">,
): string {
  return new URL(config.serverUrl).origin;
}

/**
 * RFC 9728 (Protected Resource) + RFC 8414 (Authorization Server) metadata.
 * Unauthenticated callers follow `401` → `WWW-Authenticate: resource_metadata`
 * → PRM (`authorization_servers` = MCP origin) → this AS document on the MCP
 * host → DCR at `registration_endpoint` → Cognito authorize/token.
 */
export function buildAuthMetadataOptions(config: Config): AuthMetadataOptions {
  const cognitoDomainBase = `https://${config.cognitoDomain}.auth.${config.cognitoRegion}.amazoncognito.com`;
  const issuer = discoveredAuthorizationServerIssuer(config);

  return {
    oauthMetadata: {
      issuer,
      authorization_endpoint: `${cognitoDomainBase}/oauth2/authorize`,
      token_endpoint: `${cognitoDomainBase}/oauth2/token`,
      registration_endpoint: `${issuer}/register`,
      response_types_supported: ["code", "token"],
      grant_types_supported: ["authorization_code", "client_credentials"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: [
        "none",
        "client_secret_basic",
        "client_secret_post",
      ],
      scopes_supported: ["openid", "email", profileReadScope(config)],
    },
    resourceServerUrl: new URL(config.serverUrl),
    resourceName: "Candidate profile MCP server",
    scopesSupported: [profileReadScope(config)],
  };
}
