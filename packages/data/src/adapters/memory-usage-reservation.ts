import { randomUUID } from "node:crypto";
import type { UsageReservation, UsageReservationResult } from "@portfolio/shared/ports";

const WINDOW_MS = 24 * 60 * 60 * 1000;
/** Mirrors HOLD_TTL_SEC in the Dynamo adapter for fixture/local parity. */
const HOLD_TTL_MS = 5 * 60 * 1000;

function roundUsd(value: number): number {
  return Math.max(0, Math.round(value * 1_000_000) / 1_000_000);
}

function windowKey(now: number): number {
  return Math.floor(now / WINDOW_MS) * WINDOW_MS;
}

type Hold = { userId: string; windowKey: number; amountUsd: number; expiresAtMs: number };

/**
 * In-memory reservation adapter for fixture/local development and tests.
 * Mirrors the Dynamo adapter's short-TTL hold semantics so a killed process
 * (or a test asserting on that behavior) sees the same self-healing
 * guarantees the production adapter provides.
 */
export function createMemoryUsageReservation(): UsageReservation {
  const settled = new Map<string, number>();
  const holds = new Map<string, Hold>();

  function settledKey(userId: string): string {
    return `${userId}#${windowKey(Date.now())}`;
  }

  function liveHeldUsd(userId: string, nowMs: number): number {
    let total = 0;
    const currentWindow = windowKey(nowMs);
    for (const hold of holds.values()) {
      if (
        hold.userId === userId &&
        hold.windowKey === currentWindow &&
        hold.expiresAtMs > nowMs
      ) {
        total += hold.amountUsd;
      }
    }
    return total;
  }

  return {
    async reserve(
      userId: string,
      estimatedUsd: number,
      capUsd: number,
    ): Promise<UsageReservationResult> {
      const nowMs = Date.now();
      const roundedEstimate = roundUsd(estimatedUsd);
      const roundedCap = roundUsd(capUsd);
      const settledUsd = settled.get(settledKey(userId)) ?? 0;
      const heldUsd = liveHeldUsd(userId, nowMs);
      const projectedUsd = roundUsd(settledUsd + heldUsd + roundedEstimate);

      if (projectedUsd > roundedCap) {
        return {
          ok: false,
          spentUsd: roundUsd(settledUsd + heldUsd),
          capUsd: roundedCap,
          reason: "cost-cap",
        };
      }

      const reservationId = randomUUID();
      holds.set(reservationId, {
        userId,
        windowKey: windowKey(nowMs),
        amountUsd: roundedEstimate,
        expiresAtMs: nowMs + HOLD_TTL_MS,
      });
      return { ok: true, spentUsd: projectedUsd, capUsd: roundedCap, reservationId };
    },

    async settle(userId: string, reservationId: string, actualUsd: number) {
      holds.delete(reservationId);
      const key = settledKey(userId);
      settled.set(key, roundUsd((settled.get(key) ?? 0) + actualUsd));
    },

    async release(_userId: string, reservationId: string) {
      holds.delete(reservationId);
    },
  };
}
