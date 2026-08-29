import type { FeedFetch } from "./types";

const ATS_API_HOSTS = new Set([
  "boards-api.greenhouse.io",
  "api.lever.co",
  "jobs.ashbyhq.com",
]);

export const ATS_PUBLIC_HOSTS = new Set([
  "boards.greenhouse.io",
  "job-boards.greenhouse.io",
  "jobs.lever.co",
  "jobs.ashbyhq.com",
]);

export function isAllowedAtsHost(hostname: string): boolean {
  const host = hostname.replace(/^www\./, "").toLowerCase();
  return ATS_API_HOSTS.has(host) || ATS_PUBLIC_HOSTS.has(host);
}

/** Map a public ATS apply URL to a JSON API URL, or null if we should not fetch. */
export function atsJsonUrl(applyUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(applyUrl);
  } catch {
    return null;
  }
  if (!isAllowedAtsHost(parsed.hostname)) return null;

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  const parts = parsed.pathname.split("/").filter(Boolean);

  if (host === "boards.greenhouse.io" || host === "job-boards.greenhouse.io") {
    const board = parts[0];
    const jobId = parts[parts.length - 1];
    if (!board || !jobId || !/^\d+$/.test(jobId)) return null;
    return `https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${jobId}`;
  }

  if (host === "jobs.lever.co") {
    const company = parts[0];
    const posting = parts[1];
    if (!company || !posting) return null;
    return `https://api.lever.co/v0/postings/${company}/${posting}`;
  }

  if (host === "boards-api.greenhouse.io" || host === "api.lever.co") {
    return parsed.toString();
  }

  return null;
}

const SHORT_JD_CHARS = 400;

/**
 * Fetch a longer JD from an allowlisted ATS JSON API when the feed snippet is
 * short. Never follows a caller-supplied URL — only our stored apply_url after
 * the host allowlist in {@link atsJsonUrl}.
 */
export async function hydrateJobDescription(
  applyUrl: string,
  existingJd: string,
  fetchImpl: FeedFetch,
): Promise<string> {
  if (existingJd.trim().length >= SHORT_JD_CHARS) return existingJd;
  const url = atsJsonUrl(applyUrl);
  if (!url) return existingJd;
  try {
    const response = await fetchImpl(url);
    if (response.status >= 400) return existingJd;
    const extracted = extractJdFromAtsJson(JSON.parse(response.text) as unknown);
    return extracted.length > existingJd.length ? extracted : existingJd;
  } catch {
    return existingJd;
  }
}

export function extractJdFromAtsJson(json: unknown): string {
  if (typeof json !== "object" || json === null) return "";
  const body = json as Record<string, unknown>;
  if (typeof body.content === "string") return body.content;
  if (typeof body.descriptionPlain === "string") return body.descriptionPlain;
  if (typeof body.description === "string") return body.description;
  if (
    typeof body.description === "object" &&
    body.description !== null &&
    "body" in body.description &&
    typeof (body.description as { body?: unknown }).body === "string"
  ) {
    return (body.description as { body: string }).body;
  }
  return "";
}
