import type { JobSource } from "@portfolio/shared/schemas";

export type NormalizedJob = {
  source: JobSource;
  source_id: string;
  company: string;
  title: string;
  location: string;
  remote: boolean;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  apply_url: string;
  jd_text: string;
  posted_at: string;
};

export type FeedFetch = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ status: number; text: string }>;

export const JOB_FEED_USER_AGENT =
  "Mozilla/5.0 (compatible; KhubaibPortfolioJobIngest/1.0; +https://khubaibqaiser.com)";

const MAX_BYTES = 1_000_000;

export async function defaultFeedFetch(
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
): Promise<{ status: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      method: init?.method ?? "GET",
      headers: {
        "user-agent": JOB_FEED_USER_AGENT,
        accept: "application/json, application/rss+xml, text/xml, */*",
        ...init?.headers,
      },
      body: init?.body,
      signal: controller.signal,
      redirect: "follow",
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    const sliced = buffer.subarray(0, MAX_BYTES);
    return { status: response.status, text: sliced.toString("utf8") };
  } finally {
    clearTimeout(timer);
  }
}

export function isWithinRecency(
  postedAt: string,
  recencyDays: number,
  now = new Date(),
): boolean {
  const posted = Date.parse(postedAt);
  if (Number.isNaN(posted)) return false;
  return now.getTime() - posted <= recencyDays * 24 * 60 * 60 * 1000;
}

export function utcDateStamp(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
