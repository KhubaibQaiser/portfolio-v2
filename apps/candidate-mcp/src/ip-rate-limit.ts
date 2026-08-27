import { getRateLimiter } from "@portfolio/data";
import type { RateLimitCheck } from "./rate-limit";
import type { Config } from "./config";

const IP_RATE_LIMIT_PREFIX = "candidate-mcp-ip";

/**
 * Per-viewer-IP HTTP rate limit checked before API-key verification so brute
 * force and session spam are throttled even when tokens are invalid.
 */
export async function checkIpRateLimit(
  ip: string,
  config: Pick<Config, "ipRateLimitMax" | "ipRateLimitWindowSec">,
): Promise<RateLimitCheck> {
  const identifier = ip === "unknown" ? "unknown:ip" : `ip:${ip}`;
  const result = await getRateLimiter().check(identifier, {
    max: config.ipRateLimitMax,
    windowSec: config.ipRateLimitWindowSec,
    prefix: IP_RATE_LIMIT_PREFIX,
  });
  if (result.ok) return { ok: true };
  return { ok: false, retryAfterSeconds: result.retryAfterSeconds };
}
