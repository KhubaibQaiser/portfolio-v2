/**
 * Runtime configuration for the candidate-mcp server, read once from the
 * environment. Kept as a single typed seam so the Lambda, stdio, and test
 * entry points all resolve config the same way instead of reading
 * `process.env` ad hoc.
 */
export type Config = {
  /** Public URL of this MCP server, e.g. `https://mcp.khubaibqaiser.com/mcp`. */
  serverUrl: string;
  /** Cognito User Pool ID JWTs must be issued from. */
  cognitoUserPoolId: string;
  /** AWS region the user pool lives in (for issuer/JWKS URL construction). */
  cognitoRegion: string;
  /** Resource server identifier (also the OAuth scope prefix), e.g. `https://mcp.khubaibqaiser.com`. */
  resourceServerIdentifier: string;
  /** Cognito hosted-UI domain prefix used to build the OAuth2 token endpoint for AS metadata. */
  cognitoDomain: string;
  /**
   * Kill switch: when explicitly set to `"false"`, every request (including
   * the well-known routes) is answered `503` regardless of auth. Defaults to
   * enabled so a missing env var never silently disables the server.
   */
  enabled: boolean;
  /** Max tool calls a single `client_id` may make per rate-limit window. */
  rateLimitMax: number;
  /** Rate-limit window, in seconds. */
  rateLimitWindowSec: number;
  /**
   * Shared secret CloudFront injects as `x-origin-verify`. Required on the
   * Lambda HTTP path (fail-closed). Stdio never uses this handler.
   */
  originVerifySecret: string | null;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): Config {
  return {
    serverUrl: requireEnv("MCP_SERVER_URL"),
    cognitoUserPoolId: requireEnv("COGNITO_USER_POOL_ID"),
    cognitoRegion: requireEnv("COGNITO_REGION"),
    resourceServerIdentifier: requireEnv("MCP_RESOURCE_SERVER_IDENTIFIER"),
    cognitoDomain: requireEnv("COGNITO_DOMAIN"),
    enabled: process.env.MCP_ENABLED !== "false",
    rateLimitMax: Number(process.env.MCP_RATE_LIMIT_MAX ?? 30),
    rateLimitWindowSec: Number(process.env.MCP_RATE_LIMIT_WINDOW_SEC ?? 60),
    // Lambda: CloudFormation dynamic reference into ORIGIN_VERIFY_SECRET.
    // Stdio / unit tests: unset (stdio never uses this handler; tests inject
    // the field on Config directly).
    originVerifySecret: process.env.ORIGIN_VERIFY_SECRET ?? null,
  };
}

/** The single OAuth scope this server understands. */
export function profileReadScope(
  config: Pick<Config, "resourceServerIdentifier">,
): string {
  return `${config.resourceServerIdentifier}/profile.read`;
}
