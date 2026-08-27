/**
 * Runtime configuration for the candidate-mcp server, read once from the
 * environment. Kept as a single typed seam so the Lambda, stdio, and test
 * entry points all resolve config the same way instead of reading
 * `process.env` ad hoc.
 */
export type Config = {
  /** Public URL of this MCP server, e.g. `https://mcp.khubaibqaiser.com/mcp`. */
  serverUrl: string;
  /**
   * Kill switch: when explicitly set to `"false"`, every request is answered
   * `503` regardless of auth. Defaults to enabled.
   */
  enabled: boolean;
  /** Max HTTP requests per viewer IP per window (before auth). */
  ipRateLimitMax: number;
  ipRateLimitWindowSec: number;
  /** Default tool rate limits for stdio (no verified HTTP caller). */
  rateLimitMax: number;
  rateLimitWindowSec: number;
  /** Smoke-test key limits when the deploy secret matches. */
  smokeTestRateLimitMax: number;
  smokeTestRateLimitWindowSec: number;
  /** Secrets Manager ARN for the CI smoke-test bearer (optional locally). */
  smokeTestKeySecretArn: string | null;
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
    enabled: process.env.MCP_ENABLED !== "false",
    ipRateLimitMax: parsePositiveInt(process.env.MCP_IP_RATE_LIMIT_MAX, 60),
    ipRateLimitWindowSec: parsePositiveInt(process.env.MCP_IP_RATE_LIMIT_WINDOW_SEC, 60),
    rateLimitMax: parsePositiveInt(process.env.MCP_RATE_LIMIT_MAX, 30),
    rateLimitWindowSec: parsePositiveInt(process.env.MCP_RATE_LIMIT_WINDOW_SEC, 60),
    smokeTestRateLimitMax: parsePositiveInt(process.env.MCP_SMOKE_RATE_LIMIT_MAX, 10),
    smokeTestRateLimitWindowSec: parsePositiveInt(
      process.env.MCP_SMOKE_RATE_LIMIT_WINDOW_SEC,
      60,
    ),
    smokeTestKeySecretArn: process.env.MCP_SMOKE_TEST_KEY_SECRET_ARN ?? null,
    originVerifySecret: process.env.ORIGIN_VERIFY_SECRET ?? null,
  };
}
