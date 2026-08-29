import type { ContentRepository, JobBoardRepository } from "@portfolio/shared/ports";
import type { JobPosting } from "@portfolio/shared/schemas";
import { queryAllByStatus } from "./query-all";
import type { JobEmailJob } from "./send-job-email";
import { snoozeFollowUp } from "./status-machine";

export type NotifyMailer = {
  sendDigest: (jobs: JobEmailJob[]) => Promise<void>;
  sendFollowUp: (job: JobEmailJob, followUpAt: string) => Promise<void>;
};

export type RunJobNotifyDeps = {
  content: ContentRepository;
  jobs: JobBoardRepository;
  mailer: NotifyMailer | null;
  now?: Date;
  logger?: { error: (message: string, extra?: Record<string, unknown>) => void };
};

export type JobNotifySummary = {
  digested: number;
  followUps: number;
};

function asEmailJob(row: JobPosting): JobEmailJob {
  return {
    id: row.id,
    company: row.company,
    title: row.title,
    score: row.score,
    applyUrl: row.sources[0]?.apply_url ?? "",
  };
}

export async function runJobNotify(deps: RunJobNotifyDeps): Promise<JobNotifySummary> {
  const now = deps.now ?? new Date();
  const nowIso = now.toISOString();
  const prefs = await deps.content.getJobPreferences();
  const news = await queryAllByStatus(deps.jobs, "new");

  const digestCandidates = news.filter(
    (row) => row.score >= prefs.digest_threshold && !row.digested_at,
  );
  const digestWon: JobPosting[] = [];
  for (const row of digestCandidates) {
    if (await deps.jobs.claimDigest(row.id, nowIso)) {
      digestWon.push(row);
    }
  }
  if (digestWon.length > 0 && deps.mailer) {
    try {
      await deps.mailer.sendDigest(digestWon.map(asEmailJob));
    } catch (error) {
      deps.logger?.error("job digest email failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const followStatuses = ["applied", "snoozed"] as const;
  let followUps = 0;
  for (const status of followStatuses) {
    const rows = await queryAllByStatus(deps.jobs, status);
    for (const row of rows) {
      if (!row.follow_up_at || row.follow_up_at > nowIso) continue;
      if (!deps.mailer) continue;
      try {
        await deps.mailer.sendFollowUp(asEmailJob(row), row.follow_up_at);
        await deps.jobs.update(row.id, {
          follow_up_at: snoozeFollowUp(row.follow_up_at, now),
        });
        followUps += 1;
      } catch (error) {
        deps.logger?.error("job follow-up email failed", {
          jobId: row.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return { digested: digestWon.length, followUps };
}
