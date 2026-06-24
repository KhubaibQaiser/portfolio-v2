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
 * dev uses an in-memory/no-op adapter.
 *
 * Implementations must not silently swallow backing-store errors. They either
 * resolve with a {@link RateLimitResult} or reject, leaving the fail-open vs
 * fail-closed policy (and logging) to the caller, which has observability.
 */
export type RateLimiter = {
  check(identifier: string, options: RateLimitOptions): Promise<RateLimitResult>;
};

export type CostCapResult =
  | { ok: true; spentUsd: number; capUsd: number }
  | { ok: false; spentUsd: number; capUsd: number; reason: "cost-cap" };

/**
 * Guards AI spend against a per-user daily USD cap. Implementations must not
 * swallow backing-store errors: if spend cannot be computed the error
 * propagates so the caller blocks the request, logs it, and returns an
 * appropriate message — never silently allowing the generation.
 */
export type CostCap = {
  check(userId: string, capUsd: number): Promise<CostCapResult>;
};
