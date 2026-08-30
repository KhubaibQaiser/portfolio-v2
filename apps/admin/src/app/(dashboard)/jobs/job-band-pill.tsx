import type { JobBand } from "@portfolio/shared/schemas";
import { cn } from "@/lib/utils";

const BAND_STYLES: Record<JobBand, string> = {
  excellent:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  strong: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  moderate:
    "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  weak: "border-border bg-muted/40 text-muted-foreground",
  filtered: "border-border bg-muted/20 text-muted-foreground",
};

type JobBandPillProps = {
  score: number;
  band: JobBand;
  className?: string;
};

export function JobBandPill({ score, band, className }: JobBandPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums",
        BAND_STYLES[band],
        className,
      )}
    >
      <span>{score}</span>
      <span className="capitalize opacity-80">{band}</span>
    </span>
  );
}
