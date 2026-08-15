import { redirect } from "next/navigation";
import { getContentRepository } from "@portfolio/data";
import { getResumeData } from "@portfolio/shared/resume-data";
import { pickDefaultResumeLayout } from "@portfolio/shared/schemas";
import { requireAdmin } from "@/lib/auth-guard";
import { logger } from "@/lib/logger";
import { GeneratorClient } from "./_components/generator-client";
import { UsageStat } from "./_components/usage-stat";
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
    logger.error("resume-generator page data load failed", {
      userId: auth.id,
      error: err instanceof Error ? err : new Error(String(err)),
    });
    throw err;
  }
  historyRows = historyRows.filter((row) => row.created_by === auth.id);

  const [layouts, baseResume] = await Promise.all([
    repo.getResumeLayouts().catch(() => []),
    getResumeData(repo).catch(() => null),
  ]);

  logger.info("resume-generator page loaded", {
    userId: auth.id,
    historyCount: historyRows.length,
    dailyUsd: daily.totalUsd,
    monthlyRuns: monthly.count,
    layoutCount: layouts.length,
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
    layoutId: r.layout_id,
  }));

  const defaultLayoutId = pickDefaultResumeLayout(layouts)?.id ?? "";

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resume AI</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Tailor your resume to a job description using a layout&apos;s guidelines.
            Summary and bullets are rewritten from live CMS data. Cover letter and ATS
            stay available as secondary tools.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-right text-xs">
          <UsageStat
            label="Today"
            value={`$${daily.totalUsd.toFixed(3)}`}
            sub={`of $${DAILY_CAP.toFixed(2)} cap`}
          />
          <UsageStat
            label="This month"
            value={`$${monthly.totalUsd.toFixed(2)}`}
            sub={`${monthly.count} runs`}
          />
          <UsageStat label="History" value={String(history.length)} sub="recent" />
        </div>
      </div>

      <GeneratorClient
        initialHistory={history}
        layouts={layouts}
        defaultLayoutId={defaultLayoutId}
        baseResume={baseResume}
      />
    </>
  );
}
