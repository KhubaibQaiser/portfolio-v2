import { getUsageReservation } from "@portfolio/data";
import type { UsageReservation, UsageReservationResult } from "@portfolio/shared/ports";

export type CostCapResult = UsageReservationResult;

export type UsageReservationGuard = {
  reservation: UsageReservation;
  reservedUsd: number;
};

function parsePositiveUsd(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function parseDailyCapUsd(): number {
  return parsePositiveUsd(process.env.RESUME_GEN_DAILY_USD_CAP, 2);
}

export function estimateGenerationReservationUsd(model: "quality" | "fast"): number {
  const fallback = model === "quality" ? 0.25 : 0.05;
  return parsePositiveUsd(process.env.RESUME_GEN_RESERVE_USD, fallback);
}

export function estimateAtsReservationUsd(): number {
  return parsePositiveUsd(process.env.RESUME_ATS_RESERVE_USD, 0.02);
}

/**
 * Atomically reserve estimated AI spend for today's window. The reservation is
 * the enforcement source; generation history remains an audit/reporting record.
 * Store errors propagate so callers fail closed and surface a 503.
 */
export async function reserveAiUsage(
  userId: string,
  estimatedUsd: number,
): Promise<
  (UsageReservationGuard & { ok: true }) | (UsageReservationResult & { ok: false })
> {
  const reservation = getUsageReservation();
  const result = await reservation.reserve(userId, estimatedUsd, parseDailyCapUsd());
  if (!result.ok) return result;
  return { ok: true, reservation, reservedUsd: estimatedUsd };
}
