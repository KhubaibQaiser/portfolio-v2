import type { NormalizedJob } from "./types";
import { isWithinRecency } from "./types";

type RemoteOkJob = {
  id?: string | number;
  position?: string;
  company?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  apply_url?: string;
  url?: string;
  description?: string;
  date?: string;
  legal?: unknown;
};

export function parseRemoteOkPayload(
  json: unknown,
  recencyDays: number,
  now = new Date(),
): NormalizedJob[] {
  if (!Array.isArray(json)) return [];
  const out: NormalizedJob[] = [];
  for (const raw of json) {
    const job = raw as RemoteOkJob;
    if (job.legal !== undefined) continue;
    const apply = job.apply_url ?? job.url;
    if (!job.position || !job.company || !apply || job.id === undefined) continue;
    const posted_at = job.date ? new Date(job.date).toISOString() : "";
    if (!posted_at || !isWithinRecency(posted_at, recencyDays, now)) continue;
    out.push({
      source: "remoteok",
      source_id: String(job.id),
      company: job.company,
      title: job.position,
      location: job.location ?? "Remote",
      remote: true,
      salary_min: job.salary_min && job.salary_min > 0 ? job.salary_min : null,
      salary_max: job.salary_max && job.salary_max > 0 ? job.salary_max : null,
      salary_currency: "USD",
      apply_url: apply,
      jd_text: job.description ?? "",
      posted_at,
    });
  }
  return out;
}
