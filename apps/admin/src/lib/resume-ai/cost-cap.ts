import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@portfolio/shared/supabase/database.types";
import { sumDailyUsage } from "@portfolio/shared/supabase/queries";

export type CostCapResult =
  | { ok: true; spentUsd: number; capUsd: number }
  | { ok: false; spentUsd: number; capUsd: number; reason: "cost-cap" };

function parseCapUsd(): number {
  const raw = process.env.RESUME_GEN_DAILY_USD_CAP;
  if (!raw) return 2;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 2;
}

/**
 * Check whether the admin has headroom under today's USD cap.
 * Falls back to "allowed" on DB errors so a transient Supabase
 * issue cannot brick the generator entirely.
 */
export async function checkCostCap(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<CostCapResult> {
  const capUsd = parseCapUsd();
  try {
    const { totalUsd } = await sumDailyUsage(client, userId);
    if (totalUsd >= capUsd) {
      return { ok: false, spentUsd: totalUsd, capUsd, reason: "cost-cap" };
    }
    return { ok: true, spentUsd: totalUsd, capUsd };
  } catch {
    return { ok: true, spentUsd: 0, capUsd };
  }
}
