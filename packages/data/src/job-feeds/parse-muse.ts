import type { NormalizedJob } from "./types";
import { isWithinRecency } from "./types";

type MuseJob = {
  id?: number;
  name?: string;
  contents?: string;
  publication_date?: string;
  company?: { name?: string };
  locations?: Array<{ name?: string }>;
  refs?: { landing_page?: string };
};

export function parseMusePayload(
  json: unknown,
  recencyDays: number,
  now = new Date(),
): { jobs: NormalizedJob[]; pageCount: number } {
  if (typeof json !== "object" || json === null) return { jobs: [], pageCount: 0 };
  const body = json as { results?: unknown; page_count?: number };
  const results = Array.isArray(body.results) ? body.results : [];
  const jobs: NormalizedJob[] = [];
  for (const raw of results) {
    const job = raw as MuseJob;
    const apply = job.refs?.landing_page;
    if (!job.id || !job.name || !job.company?.name || !apply) continue;
    const posted_at = job.publication_date
      ? new Date(job.publication_date).toISOString()
      : "";
    if (!posted_at || !isWithinRecency(posted_at, recencyDays, now)) continue;
    const location =
      job.locations
        ?.map((loc) => loc.name)
        .filter(Boolean)
        .join(", ") ?? "";
    const remote = /remote|flexible/i.test(location);
    jobs.push({
      source: "themuse",
      source_id: String(job.id),
      company: job.company.name,
      title: job.name,
      location: location || (remote ? "Remote" : ""),
      remote,
      salary_min: null,
      salary_max: null,
      salary_currency: null,
      apply_url: apply,
      jd_text: job.contents ?? "",
      posted_at,
    });
  }
  return { jobs, pageCount: typeof body.page_count === "number" ? body.page_count : 0 };
}
