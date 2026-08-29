"use client";

import { useState } from "react";
import type { JobPosting, JobStatus } from "@portfolio/shared/schemas";
import {
  draftRecruiterMessage,
  setJobStatus,
  snoozeJob,
  tailorJob,
} from "@/lib/job-actions";
import { useToast } from "@/components/toast/toast-provider";
import { runServerAction } from "@/lib/run-server-action";
import { cn } from "@/lib/utils";

const STATUS_ACTIONS: Array<{ label: string; status: JobStatus }> = [
  { label: "Reviewing", status: "reviewing" },
  { label: "Applied", status: "applied" },
  { label: "Discard", status: "discarded" },
  { label: "Close", status: "closed" },
];

export function JobDetailActions({ job }: { job: JobPosting }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const applyUrl = job.sources[0]?.apply_url;

  async function run(
    label: string,
    action: () => Promise<{ success: boolean; error?: string }>,
  ) {
    setBusy(label);
    await runServerAction(() => action() as never, toast, {
      successMessage: `${label} done`,
    });
    setBusy(null);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {applyUrl ? (
        <a
          href={applyUrl}
          target="_blank"
          rel="noreferrer"
          className="border-border rounded-lg border px-3 py-2 text-sm"
        >
          Open posting
        </a>
      ) : null}
      {STATUS_ACTIONS.map((item) => (
        <button
          key={item.status}
          type="button"
          disabled={busy !== null}
          onClick={() => void run(item.label, () => setJobStatus(job.id, item.status))}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium",
            item.status === "applied"
              ? "bg-accent text-accent-foreground"
              : "border-border border",
          )}
        >
          {busy === item.label ? "…" : item.label}
        </button>
      ))}
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => void run("Snooze", () => snoozeJob(job.id))}
        className="border-border rounded-lg border px-3 py-2 text-sm"
      >
        {busy === "Snooze" ? "…" : "Snooze +7d"}
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => void run("Tailor", () => tailorJob(job.id))}
        className="border-border rounded-lg border px-3 py-2 text-sm"
      >
        {busy === "Tailor" ? "…" : "One-click resume + cover"}
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => void run("Recruiter note", () => draftRecruiterMessage(job.id))}
        className="border-border rounded-lg border px-3 py-2 text-sm"
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
  );
}
