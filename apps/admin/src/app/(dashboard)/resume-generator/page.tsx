import { createClient } from "@/lib/supabase/server";
import {
  getResumeGenerations,
  sumDailyUsage,
  sumMonthlyUsage,
} from "@portfolio/shared/supabase/queries";
import { GeneratorClient } from "./_components/generator-client";
import type { HistoryItem } from "./_components/types";

export const dynamic = "force-dynamic";

const DAILY_CAP = Number.parseFloat(
  process.env.RESUME_GEN_DAILY_USD_CAP ?? "2",
);

export default async function ResumeGeneratorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [historyRows, daily, monthly] = await Promise.all([
    user
      ? getResumeGenerations(supabase, { limit: 20 }).catch(() => [])
      : Promise.resolve([]),
    user
      ? sumDailyUsage(supabase, user.id).catch(() => ({
          totalUsd: 0,
          count: 0,
        }))
      : Promise.resolve({ totalUsd: 0, count: 0 }),
    user
      ? sumMonthlyUsage(supabase, user.id).catch(() => ({
          totalUsd: 0,
          count: 0,
        }))
      : Promise.resolve({ totalUsd: 0, count: 0 }),
  ]);

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
          <p className="mt-1 text-sm text-muted-foreground">
            Generate a JD-tailored resume and cover letter from your live
            portfolio data.
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
          <Stat
            label="History"
            value={String(history.length)}
            sub="recent"
          />
        </div>
      </div>

      <GeneratorClient initialHistory={history} dailyCap={DAILY_CAP} />
    </>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-left">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
