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
  /** Resource server identifier (also the OAuth scope prefix). */
  resourceServerIdentifier: string;
  /** Cognito hosted-UI domain prefix for AS metadata endpoints. */
  cognitoDomain: string;
  /**
   * Kill switch: when explicitly set to `"false"`, every request (including
   * the well-known routes) is answered `503` regardless of auth.
   */
  enabled: boolean;
  /** Max HTTP requests per viewer IP per window (after discovery). */
  ipRateLimitMax: number;
  ipRateLimitWindowSec: number;
  /** Max tool calls a single `client_id` may make per rate-limit window. */
  rateLimitMax: number;
  rateLimitWindowSec: number;
  /**
   * Shared secret CloudFront injects as `x-origin-verify`. Required on the
   * Lambda HTTP path (fail-closed). Stdio never uses this handler.
   */
  originVerifySecret: string | null;
};

export type ClientRateLimit = {
  rateLimitMax: number;
  rateLimitWindowSec: number;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function loadConfig(): Config {
  return {
    serverUrl: requireEnv("MCP_SERVER_URL"),
    cognitoUserPoolId: requireEnv("COGNITO_USER_POOL_ID"),
    cognitoRegion: requireEnv("COGNITO_REGION"),
    resourceServerIdentifier: requireEnv("MCP_RESOURCE_SERVER_IDENTIFIER"),
    cognitoDomain: requireEnv("COGNITO_DOMAIN"),
    enabled: process.env.MCP_ENABLED !== "false",
    ipRateLimitMax: parsePositiveInt(process.env.MCP_IP_RATE_LIMIT_MAX, 60),
    ipRateLimitWindowSec: parsePositiveInt(process.env.MCP_IP_RATE_LIMIT_WINDOW_SEC, 60),
    rateLimitMax: parsePositiveInt(process.env.MCP_RATE_LIMIT_MAX, 30),
    rateLimitWindowSec: parsePositiveInt(process.env.MCP_RATE_LIMIT_WINDOW_SEC, 60),
    originVerifySecret: process.env.ORIGIN_VERIFY_SECRET ?? null,
  };
}

/** The single OAuth scope this server understands. */
export function profileReadScope(
  config: Pick<Config, "resourceServerIdentifier">,
): string {
  return `${config.resourceServerIdentifier}/profile.read`;
}
