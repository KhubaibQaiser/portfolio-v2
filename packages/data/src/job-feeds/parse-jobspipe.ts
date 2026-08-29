import type { NormalizedJob } from "./types";
import { isWithinRecency } from "./types";

type JobsPipeJob = {
  id?: string;
  job_title?: string;
  company?: string;
  location?: string;
  remote?: boolean;
  min_annual_salary_usd?: number;
  max_annual_salary_usd?: number;
  final_url?: string;
  url?: string;
  description?: string;
  date_posted?: string;
};

export function parseJobsPipePayload(
  json: unknown,
  recencyDays: number,
  now = new Date(),
): NormalizedJob[] {
  if (typeof json !== "object" || json === null || !("data" in json)) return [];
  const data = (json as { data: unknown }).data;
  if (!Array.isArray(data)) return [];
  const out: NormalizedJob[] = [];
  for (const raw of data) {
    const job = raw as JobsPipeJob;
    const apply = job.final_url ?? job.url;
    if (!job.id || !job.job_title || !job.company || !apply) continue;
    const posted_at = job.date_posted ? new Date(job.date_posted).toISOString() : "";
    if (!posted_at || !isWithinRecency(posted_at, recencyDays, now)) continue;
    out.push({
      source: "jobspipe",
      source_id: job.id,
      company: job.company,
      title: job.job_title,
      location: job.location ?? (job.remote ? "Remote" : ""),
      remote: Boolean(job.remote),
      salary_min: job.min_annual_salary_usd ?? null,
      salary_max: job.max_annual_salary_usd ?? null,
      salary_currency: "USD",
      apply_url: apply,
      jd_text: job.description ?? "",
      posted_at,
    });
  }
  return out;
}

export function isJobsPipeLiveKey(value: string): boolean {
  return value.startsWith("jp_live_") || value.startsWith("jp_");
}
