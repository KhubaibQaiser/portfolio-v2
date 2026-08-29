import type { NormalizedJob } from "./types";
import { isWithinRecency } from "./types";

type RemotiveJob = {
  id?: number | string;
  title?: string;
  company_name?: string;
  candidate_required_location?: string;
  salary?: string;
  url?: string;
  description?: string;
  publication_date?: string;
};

export function parseRemotivePayload(
  json: unknown,
  recencyDays: number,
  now = new Date(),
): NormalizedJob[] {
  if (typeof json !== "object" || json === null || !("jobs" in json)) return [];
  const jobs = (json as { jobs: unknown }).jobs;
  if (!Array.isArray(jobs)) return [];
  const out: NormalizedJob[] = [];
  for (const raw of jobs) {
    const job = raw as RemotiveJob;
    if (!job.title || !job.company_name || !job.url || !job.id) continue;
    const posted_at = job.publication_date
      ? new Date(job.publication_date).toISOString()
      : "";
    if (!posted_at || !isWithinRecency(posted_at, recencyDays, now)) continue;
    out.push({
      source: "remotive",
      source_id: String(job.id),
      company: job.company_name,
      title: job.title,
      location: job.candidate_required_location ?? "Remote",
      remote: true,
      salary_min: null,
      salary_max: null,
      salary_currency: null,
      apply_url: job.url,
      jd_text: job.description ?? "",
      posted_at,
    });
  }
  return out;
}
