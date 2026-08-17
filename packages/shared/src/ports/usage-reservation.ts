export type UsageReservationResult =
  | { ok: true; spentUsd: number; capUsd: number }
  | { ok: false; spentUsd: number; capUsd: number; reason: "cost-cap" };

/**
 * Atomic per-user AI spend reservation. Unlike a read-then-write usage summary,
 * `reserve()` must apply the increment and cap check in one backing-store
 * operation so concurrent requests cannot all observe headroom and overspend.
 * Callers settle with actual usage after the model completes and release on
 * failure before any billable work is known.
 */
export type UsageReservation = {
  reserve(
    userId: string,
    estimatedUsd: number,
    capUsd: number,
  ): Promise<UsageReservationResult>;
  settle(userId: string, reservedUsd: number, actualUsd: number): Promise<void>;
  release(userId: string, reservedUsd: number): Promise<void>;
};
