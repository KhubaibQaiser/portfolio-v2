import type { NormalizedJob } from "./types";
import { isWithinRecency } from "./types";

type ArbeitnowJob = {
  slug?: string;
  title?: string;
  company_name?: string;
  location?: string;
  remote?: boolean;
  url?: string;
  description?: string;
  created_at?: number;
};

export function parseArbeitnowPayload(
  json: unknown,
  recencyDays: number,
  now = new Date(),
): NormalizedJob[] {
  if (typeof json !== "object" || json === null || !("data" in json)) return [];
  const data = (json as { data: unknown }).data;
  if (!Array.isArray(data)) return [];
  const out: NormalizedJob[] = [];
  for (const raw of data) {
    const job = raw as ArbeitnowJob;
    if (!job.slug || !job.title || !job.company_name || !job.url) continue;
    const posted_at =
      typeof job.created_at === "number"
        ? new Date(job.created_at * 1000).toISOString()
        : "";
    if (!posted_at || !isWithinRecency(posted_at, recencyDays, now)) continue;
    out.push({
      source: "arbeitnow",
      source_id: job.slug,
      company: job.company_name,
      title: job.title,
      location: job.location ?? (job.remote ? "Remote" : ""),
      remote: Boolean(job.remote),
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
