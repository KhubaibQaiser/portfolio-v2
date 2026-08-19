import type { AuthMetadataOptions } from "@modelcontextprotocol/server";
import type { Config } from "./config";
import { profileReadScope } from "./config";

/**
 * RFC 9728 (Protected Resource) + RFC 8414 (Authorization Server) metadata
 * for this server's `.well-known` discovery routes, served by
 * `oauthMetadataResponse` (see `http-handler.ts`). An unauthenticated caller
 * follows `401` → `WWW-Authenticate: resource_metadata` → this document →
 * `authorization_servers` → Cognito's token endpoint, per ADR 0003 §1.
 *
 * Client-credentials-only: `authorization_endpoint` is unused (no browser
 * redirect ever happens) but is a required RFC 8414 field, so it points at
 * Cognito's hosted-UI `/oauth2/authorize` for spec completeness.
 */
export function buildAuthMetadataOptions(config: Config): AuthMetadataOptions {
  const cognitoDomainBase = `https://${config.cognitoDomain}.auth.${config.cognitoRegion}.amazoncognito.com`;

  return {
    oauthMetadata: {
      issuer: `https://cognito-idp.${config.cognitoRegion}.amazonaws.com/${config.cognitoUserPoolId}`,
      authorization_endpoint: `${cognitoDomainBase}/oauth2/authorize`,
      token_endpoint: `${cognitoDomainBase}/oauth2/token`,
      response_types_supported: ["token"],
      grant_types_supported: ["client_credentials"],
      token_endpoint_auth_methods_supported: [
        "client_secret_basic",
        "client_secret_post",
      ],
      scopes_supported: [profileReadScope(config)],
    },
    resourceServerUrl: new URL(config.serverUrl),
    resourceName: "Candidate profile MCP server",
    scopesSupported: [profileReadScope(config)],
  };
}
