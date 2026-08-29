import { describe, expect, it, vi } from "vitest";
import { createFixtureContentRepository } from "@portfolio/data";
import { createMemoryJobBoardRepository } from "@portfolio/data";
import { DEFAULT_JOB_PREFERENCES } from "@portfolio/shared/schemas";
import type { NormalizedJob } from "@portfolio/data/job-feeds";
import { runJobIngest } from "./run-ingest";

const facts = {
  skillNames: ["TypeScript", "React", "AWS", "PostgreSQL"],
  factSheet: "Staff engineer TypeScript React AWS DynamoDB Next.js.",
};

function staffJob(overrides: Partial<NormalizedJob> = {}): NormalizedJob {
  return {
    source: "remotive",
    source_id: "1",
    company: "Acme",
    title: "Staff Software Engineer",
    location: "Remote",
    remote: true,
    salary_min: 180000,
    salary_max: 220000,
    salary_currency: "USD",
    apply_url: "https://example.com/jobs/1",
    jd_text: "Staff software engineer TypeScript React AWS PostgreSQL Next.js DynamoDB.",
    posted_at: "2026-08-08T00:00:00.000Z",
    ...overrides,
  };
}

describe("runJobIngest", () => {
  it("persists matching jobs, notifies 85+, and skips filtered rows", async () => {
    const content = createFixtureContentRepository();
    await content.upsertJobPreferences({
      ...DEFAULT_JOB_PREFERENCES,
      notify_threshold: 1,
    });
    const jobs = createMemoryJobBoardRepository();
    const sendImmediate = vi.fn().mockResolvedValue(undefined);

    const result = await runJobIngest({
      content,
      jobs,
      getFacts: async () => facts,
      jobspipeKey: null,
      fetchImpl: async () => ({ status: 599, text: "" }),
      collect: async () => ({
        jobs: [
          staffJob(),
          staffJob({
            source_id: "intern",
            title: "Junior Marketing Intern",
            jd_text: "Unpaid internship in marketing.",
            company: "OtherCo",
          }),
        ],
        jobspipeRan: false,
        errors: [],
      }),
      mailer: { sendImmediate },
      now: new Date("2026-08-10T00:00:00.000Z"),
    });

    expect(result.persisted).toBe(1);
    expect(result.filtered).toBe(1);
    expect(result.notified).toBe(1);
    expect(sendImmediate).toHaveBeenCalledTimes(1);

    const prefs = await content.getJobPreferences();
    expect(prefs.recommended_job_id).not.toBeNull();
  });

  it("does not double-mail on a second ingest of the same posting", async () => {
    const content = createFixtureContentRepository();
    await content.upsertJobPreferences({
      ...DEFAULT_JOB_PREFERENCES,
      notify_threshold: 1,
    });
    const jobs = createMemoryJobBoardRepository();
    const sendImmediate = vi.fn().mockResolvedValue(undefined);
    const collect = async () => ({
      jobs: [staffJob()],
      jobspipeRan: false,
      errors: [],
    });
    const deps = {
      content,
      jobs,
      getFacts: async () => facts,
      jobspipeKey: null,
      fetchImpl: async () => ({ status: 599, text: "" }),
      collect,
      mailer: { sendImmediate },
      now: new Date("2026-08-10T00:00:00.000Z"),
    };

    await runJobIngest(deps);
    await runJobIngest(deps);
    expect(sendImmediate).toHaveBeenCalledTimes(1);
  });
});
