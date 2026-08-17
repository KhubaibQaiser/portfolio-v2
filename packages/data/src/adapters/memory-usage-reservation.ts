import type { UsageReservation, UsageReservationResult } from "@portfolio/shared/ports";

const WINDOW_MS = 24 * 60 * 60 * 1000;

function roundUsd(value: number): number {
  return Math.max(0, Math.round(value * 1_000_000) / 1_000_000);
}

function windowKey(now: number): number {
  return Math.floor(now / WINDOW_MS) * WINDOW_MS;
}

/** In-memory reservation adapter for fixture/local development and tests. */
export function createMemoryUsageReservation(): UsageReservation {
  const spend = new Map<string, number>();

  function current(userId: string): number {
    return spend.get(`${userId}#${windowKey(Date.now())}`) ?? 0;
  }

  function set(userId: string, value: number): void {
    spend.set(`${userId}#${windowKey(Date.now())}`, roundUsd(value));
  }

  return {
    async reserve(
      userId: string,
      estimatedUsd: number,
      capUsd: number,
    ): Promise<UsageReservationResult> {
      const next = roundUsd(current(userId) + estimatedUsd);
      if (next > roundUsd(capUsd)) {
        return {
          ok: false,
          spentUsd: next,
          capUsd: roundUsd(capUsd),
          reason: "cost-cap",
        };
      }
      set(userId, next);
      return { ok: true, spentUsd: next, capUsd: roundUsd(capUsd) };
    },

    async settle(userId: string, reservedUsd: number, actualUsd: number) {
      set(userId, current(userId) - roundUsd(reservedUsd) + roundUsd(actualUsd));
    },

    async release(userId: string, reservedUsd: number) {
      set(userId, current(userId) - roundUsd(reservedUsd));
    },
  };
}
