"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { JobPosting, JobStatus } from "@portfolio/shared/schemas";
import {
  draftRecruiterMessage,
  setJobStatus,
  snoozeJob,
  tailorJob,
} from "@/lib/job-actions";
import { canTransition } from "@/lib/jobs/status-machine";
import { useToast } from "@/components/toast/toast-provider";
import { runServerAction } from "@/lib/run-server-action";
import { cn } from "@/lib/utils";

const PIPELINE_ACTIONS: Array<{ label: string; status: JobStatus; past: string }> = [
  { label: "Reviewing", status: "reviewing", past: "Marked reviewing" },
  { label: "Applied", status: "applied", past: "Marked applied" },
  { label: "Discard", status: "discarded", past: "Discarded" },
  { label: "Close", status: "closed", past: "Closed" },
  { label: "Back to new", status: "new", past: "Moved to new" },
];

type JobDetailActionsProps = {
  job: JobPosting;
};

export function JobDetailActions({ job }: JobDetailActionsProps) {
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const applyUrl = job.sources[0]?.apply_url;
  const canSnooze = canTransition(job.status, "snoozed");

  const pipeline = PIPELINE_ACTIONS.filter(
    (item) => item.status !== job.status && canTransition(job.status, item.status),
  );

  async function run(
    label: string,
    action: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string,
    options?: { confirm?: string },
  ) {
    if (options?.confirm && !window.confirm(options.confirm)) return;
    setBusy(label);
    const result = await runServerAction(() => action() as never, toast, {
      successMessage,
      onSuccess: () => router.refresh(),
    });
    setBusy(null);
    if (!result.success) return;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {applyUrl ? (
          <a
            href={applyUrl}
            target="_blank"
            rel="noreferrer"
            className="border-border rounded-lg border px-3 py-2 text-sm font-medium"
          >
            Open posting
          </a>
        ) : null}

        {pipeline.map((item) => {
          const isPrimary = job.status === "new" && item.status === "reviewing";
          return (
            <button
              key={item.status}
              type="button"
              disabled={busy !== null}
              onClick={() =>
                void run(item.label, () => setJobStatus(job.id, item.status), item.past, {
                  confirm:
                    item.status === "applied"
                      ? "Mark as applied and set a 7-day follow-up?"
                      : undefined,
                })
              }
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50",
                isPrimary ? "bg-accent text-accent-foreground" : "border-border border",
              )}
            >
              {busy === item.label ? "…" : item.label}
            </button>
          );
        })}

        {canSnooze ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void run("Snooze", () => snoozeJob(job.id), "Snoozed +7 days")}
            className="border-border rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
          >
            {busy === "Snooze" ? "…" : "Snooze +7d"}
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            void run("Tailor", () => tailorJob(job.id), "Resume + cover queued")
          }
          className="border-border rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
        >
          {busy === "Tailor" ? "…" : "One-click resume + cover"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            void run(
              "Recruiter note",
              () => draftRecruiterMessage(job.id),
              "Recruiter note drafted",
            )
          }
          className="border-border rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
        >
          {busy === "Recruiter note" ? "…" : "Draft recruiter note"}
        </button>
        {job.generation_id ? (
          <a
            href="/resume-generator"
            className="text-accent self-center text-sm hover:underline"
          >
            Resume AI history
          </a>
        ) : null}
      </div>
    </div>
  );
}
