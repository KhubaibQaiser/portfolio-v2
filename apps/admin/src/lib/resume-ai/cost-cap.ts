import { getCostCap } from "@portfolio/data";
import type { CostCapResult } from "@portfolio/shared/ports";

export type { CostCapResult };

function parseCapUsd(): number {
  const raw = process.env.RESUME_GEN_DAILY_USD_CAP;
  if (!raw) return 2;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 2;
}

/**
 * Check whether the admin has headroom under today's USD cap.
 *
 * Backed by the CostCap port (DynamoDB usage aggregation). Store errors are
 * **propagated**, not swallowed into a fail-open "allowed" — the caller decides
 * policy and surfaces the failure (see error-handling rule).
 */
export async function checkCostCap(userId: string): Promise<CostCapResult> {
  return getCostCap().check(userId, parseCapUsd());
}
