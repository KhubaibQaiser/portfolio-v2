import type { JobBand, JobStatus } from "@portfolio/shared/schemas";
import type { JobStatusCounts } from "@portfolio/shared/ports";
import { cn } from "@/lib/utils";

const STATUSES: JobStatus[] = [
  "new",
  "reviewing",
  "applied",
  "discarded",
  "snoozed",
  "closed",
];

const BANDS: Array<JobBand | ""> = [
  "",
  "excellent",
  "strong",
  "moderate",
  "weak",
  "filtered",
];

type JobStatusPillsProps = {
  status: JobStatus;
  band: JobBand | "";
  counts: JobStatusCounts;
  onStatusChange: (status: JobStatus) => void;
  onBandChange: (band: JobBand | "") => void;
};

export function JobStatusPills({
  status,
  band,
  counts,
  onStatusChange,
  onBandChange,
}: JobStatusPillsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {STATUSES.map((value) => {
        const selected = status === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={selected}
            onClick={() => onStatusChange(value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium capitalize",
              selected
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {value}
            <span className={cn("ml-1.5 tabular-nums", selected ? "opacity-90" : "opacity-60")}>
              {counts[value] ?? 0}
            </span>
          </button>
        );
      })}
      <label className="text-muted-foreground ml-1 flex items-center gap-2 text-xs">
        Band
        <select
          value={band}
          onChange={(event) => onBandChange(event.target.value as JobBand | "")}
          className="border-border bg-background text-foreground rounded-md border px-2 py-1 text-xs"
        >
          {BANDS.map((value) => (
            <option key={value || "all"} value={value}>
              {value ? value : "All bands"}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
