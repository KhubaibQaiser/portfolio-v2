export type UsageReservationResult =
  | { ok: true; spentUsd: number; capUsd: number; reservationId: string }
  | { ok: false; spentUsd: number; capUsd: number; reason: "cost-cap" };

/**
 * Per-user AI spend reservation backed by short-TTL holds rather than a
 * single mutable counter. `reserve()` checks settled spend plus all
 * currently-live holds against the cap, then writes a new hold with its own
 * short expiry and returns a `reservationId` identifying it.
 *
 * This makes the reservation self-healing: if the caller's process is killed
 * before it can call `settle`/`release` (e.g. a Lambda timeout), the
 * abandoned hold simply expires on its own within minutes and stops
 * counting toward the cap — no manual reconciliation, and the cap can never
 * be permanently exhausted by a crash.
 */
export type UsageReservation = {
  reserve(
    userId: string,
    estimatedUsd: number,
    capUsd: number,
  ): Promise<UsageReservationResult>;
  /** Converts a hold into realized spend and clears the hold. */
  settle(userId: string, reservationId: string, actualUsd: number): Promise<void>;
  /** Clears a hold without recording any spend (used on failure paths). */
  release(userId: string, reservationId: string): Promise<void>;
};
