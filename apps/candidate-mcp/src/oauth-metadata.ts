import type { AuthMetadataOptions } from "@modelcontextprotocol/server";
import type { Config } from "./config";
import { profileReadScope } from "./config";

/**
 * RFC 9728 (Protected Resource) + RFC 8414 (Authorization Server) metadata
 * for this server's `.well-known` discovery routes. Unauthenticated callers
 * follow `401` → `WWW-Authenticate: resource_metadata` → this document →
 * Cognito authorize/token (and optional DCR at `registration_endpoint`).
 */
export function buildAuthMetadataOptions(config: Config): AuthMetadataOptions {
  const cognitoDomainBase = `https://${config.cognitoDomain}.auth.${config.cognitoRegion}.amazoncognito.com`;
  const resourceOrigin = new URL(config.serverUrl).origin;

  return {
    oauthMetadata: {
      issuer: `https://cognito-idp.${config.cognitoRegion}.amazonaws.com/${config.cognitoUserPoolId}`,
      authorization_endpoint: `${cognitoDomainBase}/oauth2/authorize`,
      token_endpoint: `${cognitoDomainBase}/oauth2/token`,
      registration_endpoint: `${resourceOrigin}/register`,
      response_types_supported: ["code", "token"],
      grant_types_supported: ["authorization_code", "client_credentials"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: [
        "none",
        "client_secret_basic",
        "client_secret_post",
      ],
      scopes_supported: [
        "openid",
        "email",
        profileReadScope(config),
      ],
    },
    resourceServerUrl: new URL(config.serverUrl),
    resourceName: "Candidate profile MCP server",
    scopesSupported: [profileReadScope(config)],
  };
}
