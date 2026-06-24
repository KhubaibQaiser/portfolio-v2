export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number; limit: number; remaining: number };

export type RateLimitOptions = {
  /** Max requests allowed within the window. */
  max: number;
  /** Sliding window size in seconds. */
  windowSec: number;
  /** Optional namespace to isolate counters across features. */
  prefix?: string;
};

/**
 * Backend-agnostic rate limiter. Production uses a DynamoDB TTL counter;
 * dev uses an in-memory/no-op adapter. Implementations should fail open
 * (return `{ ok: true }`) when the backing store is unavailable.
 */
export type RateLimiter = {
  check(identifier: string, options: RateLimitOptions): Promise<RateLimitResult>;
};

export type CostCapResult =
  | { ok: true; spentUsd: number; capUsd: number }
  | { ok: false; spentUsd: number; capUsd: number; reason: "cost-cap" };

/**
 * Guards AI spend against a per-user daily USD cap. Implementations should
 * fail open on backing-store errors so a transient outage cannot brick the
 * generator entirely.
 */
export type CostCap = {
  check(userId: string, capUsd: number): Promise<CostCapResult>;
};
