import { getRateLimiter } from "@portfolio/data";
import type { ClientRateLimit } from "./config";

const RATE_LIMIT_PREFIX = "candidate-mcp";

export type RateLimitCheck = { ok: true } | { ok: false; retryAfterSeconds: number };

/**
 * Per-`client_id` rate limit, checked once per tool call (not once per HTTP
 * request, so a single MCP session issuing many `tools/call` still counts
 * each one). Backed by the same DynamoDB TTL counter the public site's
 * contact form and chat use (`@portfolio/data` `RateLimiter` port) — no new
 * infra, just a distinct `prefix` so counters never collide across features.
 */
export async function checkRateLimit(
  clientId: string,
  config: ClientRateLimit,
): Promise<RateLimitCheck> {
  const result = await getRateLimiter().check(clientId, {
    max: config.rateLimitMax,
    windowSec: config.rateLimitWindowSec,
    prefix: RATE_LIMIT_PREFIX,
  });
  if (result.ok) return { ok: true };
  return { ok: false, retryAfterSeconds: result.retryAfterSeconds };
}
