import type { RateLimiter } from "@portfolio/shared/ports";

/** Rate limiter that always allows. Used for local dev without DynamoDB. */
export function createNoopRateLimiter(): RateLimiter {
  return {
    async check() {
      return { ok: true };
    },
  };
}
