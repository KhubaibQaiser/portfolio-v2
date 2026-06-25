import { redirect } from "next/navigation";
import { getContentRepository } from "@portfolio/data";
import { requireAdmin } from "@/lib/auth-guard";
import { logger } from "@/lib/logger";
import { GeneratorClient } from "./_components/generator-client";
import type { HistoryItem } from "./_components/types";

export const dynamic = "force-dynamic";

const DAILY_CAP = Number.parseFloat(process.env.RESUME_GEN_DAILY_USD_CAP ?? "2");

export default async function ResumeGeneratorPage() {
  const auth = await requireAdmin();
  if (!auth.ok) redirect("/login");

  const repo = getContentRepository();
  let historyRows: Awaited<ReturnType<typeof repo.getResumeGenerations>>;
  let daily: Awaited<ReturnType<typeof repo.sumDailyUsage>>;
  let monthly: Awaited<ReturnType<typeof repo.sumMonthlyUsage>>;
  try {
    [historyRows, daily, monthly] = await Promise.all([
      repo.getResumeGenerations({ limit: 20 }),
      repo.sumDailyUsage(auth.id),
      repo.sumMonthlyUsage(auth.id),
    ]);
  } catch (err) {
    // Capture the real cause (the page otherwise surfaces only a bare 500),
    // then rethrow so Next still renders its error boundary.
    logger.error("resume-generator page data load failed", {
      userId: auth.id,
      error: err instanceof Error ? err : new Error(String(err)),
    });
    throw err;
  }

  logger.info("resume-generator page loaded", {
    userId: auth.id,
    historyCount: historyRows.length,
    dailyUsd: daily.totalUsd,
    monthlyRuns: monthly.count,
  });

  const history: HistoryItem[] = historyRows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    company: r.company,
    role: r.role,
    model: r.model,
    fallbackUsed: r.fallback_used,
    hasResume: r.resume !== null,
    hasCoverLetter: r.cover_letter !== null,
    hasAts: r.ats !== null,
  }));

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resume AI</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Generate a JD-tailored resume and cover letter from your live portfolio data.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-right text-xs">
          <Stat
            label="Today"
            value={`$${daily.totalUsd.toFixed(3)}`}
            sub={`of $${DAILY_CAP.toFixed(2)} cap`}
          />
          <Stat
            label="This month"
            value={`$${monthly.totalUsd.toFixed(2)}`}
            sub={`${monthly.count} runs`}
          />
          <Stat label="History" value={String(history.length)} sub="recent" />
        </div>
      </div>

      <GeneratorClient initialHistory={history} dailyCap={DAILY_CAP} />
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border-border/60 bg-muted/20 rounded-lg border px-3 py-2 text-left">
      <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
      {sub && <p className="text-muted-foreground text-[10px]">{sub}</p>}
    </div>
  );
}
