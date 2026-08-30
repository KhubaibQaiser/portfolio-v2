"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import type { JobPosting, JobStatus } from "@portfolio/shared/schemas";
import { canTransition } from "@/lib/jobs/status-machine";
import { cn } from "@/lib/utils";
import { JobBandPill } from "./job-band-pill";

export const JOB_QUEUE_GRID =
  "grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1.6fr)_minmax(7rem,0.7fr)_5.5rem_6.5rem_7.5rem] md:items-center md:gap-3";

type JobQueueRowProps = {
  job: JobPosting;
  recommended: boolean;
  busy: boolean;
  onDiscard: (id: string) => void;
  onSnooze: (id: string) => void;
  style?: CSSProperties;
};

function dateLabel(job: JobPosting, status: JobStatus): string {
  if ((status === "applied" || status === "snoozed") && job.follow_up_at) {
    return `Follow-up ${job.follow_up_at.slice(0, 10)}`;
  }
  return job.posted_at.slice(0, 10);
}

export function JobQueueRow({
  job,
  recommended,
  busy,
  onDiscard,
  onSnooze,
  style,
}: JobQueueRowProps) {
  const canDiscard = canTransition(job.status, "discarded") && job.status !== "discarded";
  const canSnooze = canTransition(job.status, "snoozed");

  return (
    <div
      style={style}
      className={cn(
        "border-border/60 group absolute left-0 w-full border-b px-3",
        recommended && "bg-accent/5",
      )}
    >
      <div className={cn(JOB_QUEUE_GRID, "hover:bg-muted/20 py-2.5 transition-colors")}>
        <Link href={`/jobs/${job.id}`} className="min-w-0">
          <div className="text-muted-foreground truncate text-xs">{job.company}</div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-foreground text-sm font-medium">{job.title}</span>
            {job.remote ? (
              <span className="border-border text-muted-foreground shrink-0 rounded border px-1.5 py-0.5 text-[10px] tracking-wide uppercase">
                Remote
              </span>
            ) : null}
            {recommended ? (
              <span className="text-accent shrink-0 text-[10px] font-semibold tracking-wide uppercase">
                Recommended
              </span>
            ) : null}
          </div>
          <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs md:hidden">
            <span>{job.location || "—"}</span>
            <span className="tabular-nums">{dateLabel(job, job.status)}</span>
            <JobBandPill score={job.score} band={job.band} />
          </div>
        </Link>

        <div className="text-muted-foreground hidden truncate text-sm md:block">
          {job.location || "—"}
        </div>
        <div className="text-muted-foreground hidden text-xs tabular-nums md:block">
          {dateLabel(job, job.status)}
        </div>
        <div className="hidden md:block">
          <JobBandPill score={job.score} band={job.band} />
        </div>

        <div className="flex items-center gap-1 md:justify-end">
          {canDiscard ? (
            <button
              type="button"
              disabled={busy}
              className="border-border hover:bg-muted rounded-md border px-2 py-1 text-xs disabled:opacity-50"
              onClick={() => onDiscard(job.id)}
            >
              Discard
            </button>
          ) : null}
          {canSnooze ? (
            <button
              type="button"
              disabled={busy}
              className="border-border hover:bg-muted rounded-md border px-2 py-1 text-xs disabled:opacity-50"
              onClick={() => onSnooze(job.id)}
            >
              Snooze
            </button>
          ) : null}
          <Link
            href={`/jobs/${job.id}`}
            className="text-accent px-2 py-1 text-xs font-medium hover:underline md:hidden"
          >
            Open
          </Link>
        </div>
      </div>
    </div>
  );
}
