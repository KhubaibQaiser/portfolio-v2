import type { ContentRepository, CostCap, CostCapResult } from "@portfolio/shared/ports";

/**
 * Daily USD spend cap for AI generations. Delegates spend accounting to the
 * content repository's `sumDailyUsage`, so it works against any backend.
 *
 * Errors are intentionally NOT swallowed: if spend cannot be computed we must
 * neither silently allow the generation (which could blow past the budget) nor
 * hide the failure. The error propagates so the caller can block the request,
 * log it through the app's observability, and return an appropriate message.
 */
export function createContentCostCap(repo: ContentRepository): CostCap {
  return {
    async check(userId: string, capUsd: number): Promise<CostCapResult> {
      const { totalUsd } = await repo.sumDailyUsage(userId);
      if (totalUsd >= capUsd) {
        return { ok: false, spentUsd: totalUsd, capUsd, reason: "cost-cap" };
      }
      return { ok: true, spentUsd: totalUsd, capUsd };
    },
  };
}
