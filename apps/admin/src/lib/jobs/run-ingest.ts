import {
  scoreJob,
  prepareJobText,
  type MatcherFacts,
} from "@portfolio/ai/matcher/score-job";
import {
  collectNormalizedJobs,
  defaultFeedFetch,
  hashJobNaturalKey,
  hydrateJobDescription,
  utcDateStamp,
  type FeedFetch,
  type NormalizedJob,
} from "@portfolio/data/job-feeds";
import { companyDomainFromName } from "@portfolio/shared/job-natural-key";
import type { ContentRepository, JobBoardRepository } from "@portfolio/shared/ports";
import type { JobPosting, JobPreferences } from "@portfolio/shared/schemas";
import { bandForScore } from "@portfolio/shared/schemas";
import type { JobEmailJob } from "./send-job-email";

export type IngestMailer = {
  sendImmediate: (job: JobEmailJob) => Promise<void>;
};

export type RunJobIngestDeps = {
  content: ContentRepository;
  jobs: JobBoardRepository;
  getFacts: () => Promise<MatcherFacts>;
  collect?: typeof collectNormalizedJobs;
  fetchImpl?: FeedFetch;
  mailer?: IngestMailer | null;
  jobspipeKey: string | null;
  now?: Date;
  logger?: { error: (message: string, extra?: Record<string, unknown>) => void };
};

export type JobIngestSummary = {
  fetched: number;
  persisted: number;
  filtered: number;
  notified: number;
  jobspipeRan: boolean;
  errors: string[];
  recommendedJobId: string | null;
};

function toPosting(
  job: NormalizedJob,
  score: number,
  band: JobPosting["band"],
  gaps: string[],
  nowIso: string,
): JobPosting {
  const id = hashJobNaturalKey({
    company: job.company,
    title: job.title,
    location: job.location,
    applyUrl: job.apply_url,
  });
  return {
    id,
    natural_key: id,
    company: job.company,
    company_domain: companyDomainFromName(job.company, job.apply_url),
    title: job.title,
    location: job.location,
    remote: job.remote,
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    salary_currency: job.salary_currency,
    jd_text: prepareJobText(job.jd_text).slice(0, 20_000),
    sources: [{ source: job.source, source_id: job.source_id, apply_url: job.apply_url }],
    score,
    band,
    gaps,
    status: "new",
    posted_at: job.posted_at,
    ingested_at: nowIso,
    notified_at: null,
    digested_at: null,
    follow_up_at: null,
    snooze_count: 0,
    generation_id: null,
    recruiter_message: null,
    created_at: nowIso,
    updated_at: nowIso,
  };
}

export async function runJobIngest(deps: RunJobIngestDeps): Promise<JobIngestSummary> {
  const now = deps.now ?? new Date();
  const nowIso = now.toISOString();
  const prefs: JobPreferences = await deps.content.getJobPreferences();
  const facts = await deps.getFacts();
  const collect = deps.collect ?? collectNormalizedJobs;
  const fetchImpl = deps.fetchImpl ?? defaultFeedFetch;
  const utcDay = utcDateStamp(now);
  const alreadyRan = prefs.jobspipe_last_search_date === utcDay;

  const collected = await collect({
    recencyDays: prefs.recency_days,
    titleFamilies: prefs.title_families,
    remotePreferred: prefs.work_arrangements.includes("remote"),
    jobspipeKey: deps.jobspipeKey,
    jobspipeAlreadyRanToday: alreadyRan,
    fetchImpl,
    now,
  });

  for (const error of collected.errors) {
    deps.logger?.error("job ingest source failed", { error });
  }

  let persisted = 0;
  let filtered = 0;
  let notified = 0;
  let best: { id: string; score: number; postedAt: string } | null = null;

  for (const raw of collected.jobs) {
    const jd = await hydrateJobDescription(raw.apply_url, raw.jd_text, fetchImpl);
    const job: NormalizedJob = { ...raw, jd_text: jd };
    const match = scoreJob(
      {
        title: job.title,
        location: job.location,
        remote: job.remote,
        salaryMin: job.salary_min,
        jdHtmlOrText: job.jd_text,
      },
      prefs,
      facts,
    );
    if (match.filtered) {
      filtered += 1;
      continue;
    }

    const row = toPosting(
      job,
      match.score,
      match.band ?? bandForScore(match.score),
      match.gaps,
      nowIso,
    );
    const existing = await deps.jobs.getById(row.id);
    const saved = await deps.jobs.upsertCanonical(row);
    persisted += 1;

    if (saved.score >= 85) {
      if (
        !best ||
        saved.score > best.score ||
        (saved.score === best.score && saved.posted_at > best.postedAt)
      ) {
        best = { id: saved.id, score: saved.score, postedAt: saved.posted_at };
      }
    }

    if (
      !existing &&
      saved.score >= prefs.notify_threshold &&
      deps.mailer &&
      (await deps.jobs.claimNotify(saved.id, nowIso))
    ) {
      try {
        await deps.mailer.sendImmediate({
          id: saved.id,
          company: saved.company,
          title: saved.title,
          score: saved.score,
          applyUrl: saved.sources[0]?.apply_url ?? "",
        });
        notified += 1;
      } catch (error) {
        deps.logger?.error("job ingest notify failed", {
          jobId: saved.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const recommendedJobId = best?.id ?? null;
  await deps.content.upsertJobPreferences({
    recommended_job_id: recommendedJobId,
    ...(collected.jobspipeRan ? { jobspipe_last_search_date: utcDay } : {}),
  });

  return {
    fetched: collected.jobs.length,
    persisted,
    filtered,
    notified,
    jobspipeRan: collected.jobspipeRan,
    errors: collected.errors,
    recommendedJobId,
  };
}
