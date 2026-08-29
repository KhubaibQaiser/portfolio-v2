import { parseArbeitnowPayload } from "./parse-arbeitnow";
import { parseJobsPipePayload, isJobsPipeLiveKey } from "./parse-jobspipe";
import { parseMusePayload } from "./parse-muse";
import { parseRemotivePayload } from "./parse-remotive";
import { parseRemoteOkPayload } from "./parse-remoteok";
import { parseWwrRss } from "./parse-wwr";
import { defaultFeedFetch, type FeedFetch, type NormalizedJob } from "./types";

export type CollectJobsOptions = {
  recencyDays: number;
  titleFamilies: string[];
  remotePreferred: boolean;
  jobspipeKey: string | null;
  jobspipeAlreadyRanToday: boolean;
  fetchImpl?: FeedFetch;
  now?: Date;
};

export type CollectJobsResult = {
  jobs: NormalizedJob[];
  jobspipeRan: boolean;
  errors: string[];
};

async function readJson(
  fetchImpl: FeedFetch,
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
): Promise<unknown> {
  const response = await fetchImpl(url, init);
  if (response.status >= 400) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return JSON.parse(response.text) as unknown;
}

export async function collectNormalizedJobs(
  options: CollectJobsOptions,
): Promise<CollectJobsResult> {
  const fetchImpl = options.fetchImpl ?? defaultFeedFetch;
  const now = options.now ?? new Date();
  const jobs: NormalizedJob[] = [];
  const errors: string[] = [];
  let jobspipeRan = false;

  const run = async (label: string, fn: () => Promise<NormalizedJob[]>) => {
    try {
      jobs.push(...(await fn()));
    } catch (error) {
      errors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  await run("remotive", async () => {
    const json = await readJson(
      fetchImpl,
      "https://remotive.com/api/remote-jobs?category=software-dev",
    );
    return parseRemotivePayload(json, options.recencyDays, now);
  });

  await run("remoteok", async () => {
    const json = await readJson(fetchImpl, "https://remoteok.com/api");
    return parseRemoteOkPayload(json, options.recencyDays, now);
  });

  await run("arbeitnow", async () => {
    const collected: NormalizedJob[] = [];
    for (let page = 1; page <= 5; page += 1) {
      const json = await readJson(
        fetchImpl,
        `https://www.arbeitnow.com/api/job-board-api?page=${page}`,
      );
      const batch = parseArbeitnowPayload(json, options.recencyDays, now);
      collected.push(...batch);
      if (batch.length === 0) break;
    }
    return collected;
  });

  await run("themuse", async () => {
    const collected: NormalizedJob[] = [];
    for (let page = 0; page < 8; page += 1) {
      const json = await readJson(
        fetchImpl,
        `https://www.themuse.com/api/public/jobs?page=${page}&category=Software%20Engineering&level=Senior%20Level&descending=true`,
      );
      const { jobs: batch, pageCount } = parseMusePayload(json, options.recencyDays, now);
      collected.push(...batch);
      if (batch.length === 0 || page + 1 >= pageCount) break;
    }
    return collected;
  });

  await run("wwr", async () => {
    const response = await fetchImpl(
      "https://weworkremotely.com/categories/remote-programming-jobs.rss",
    );
    if (response.status >= 400) throw new Error(`HTTP ${response.status}`);
    return parseWwrRss(response.text, options.recencyDays, now);
  });

  const key = options.jobspipeKey;
  if (key && isJobsPipeLiveKey(key) && !options.jobspipeAlreadyRanToday) {
    await run("jobspipe", async () => {
      const postedAfter = new Date(now.getTime() - 48 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const body = JSON.stringify({
        job_title_or: options.titleFamilies.slice(0, 5),
        remote: options.remotePreferred,
        posted_at_gte: postedAfter,
        limit: 25,
      });
      const response = await fetchImpl("https://api.jobspipe.dev/v1/jobs/search", {
        method: "POST",
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        body,
      });
      if (response.status === 402 || response.status === 429) {
        throw new Error(`JobsPipe stop ${response.status}`);
      }
      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}`);
      }
      jobspipeRan = true;
      return parseJobsPipePayload(
        JSON.parse(response.text) as unknown,
        options.recencyDays,
        now,
      );
    });
  }

  return { jobs, jobspipeRan, errors };
}
