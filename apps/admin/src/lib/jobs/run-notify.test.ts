import { describe, expect, it, vi } from "vitest";
import { createFixtureContentRepository } from "@portfolio/data";
import { createMemoryJobBoardRepository } from "@portfolio/data";
import { bandForScore, type JobPosting } from "@portfolio/shared/schemas";
import { runJobNotify } from "./run-notify";

function sample(overrides: Partial<JobPosting> = {}): JobPosting {
  const now = "2026-08-01T00:00:00.000Z";
  return {
    id: "job-1",
    natural_key: "job-1",
    company: "Acme",
    company_domain: "acme.com",
    title: "Staff Software Engineer",
    location: "Remote",
    remote: true,
    salary_min: null,
    salary_max: null,
    salary_currency: null,
    jd_text: "TypeScript",
    sources: [{ source: "remotive", source_id: "1", apply_url: "https://example.com/1" }],
    score: 88,
    band: bandForScore(88),
    gaps: [],
    status: "new",
    posted_at: now,
    ingested_at: now,
    notified_at: null,
    digested_at: null,
    follow_up_at: null,
    snooze_count: 0,
    generation_id: null,
    recruiter_message: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe("runJobNotify", () => {
  it("sends a digest once and a follow-up for due applied rows", async () => {
    const content = createFixtureContentRepository();
    const jobs = createMemoryJobBoardRepository();
    await jobs.upsertCanonical(sample());
    await jobs.upsertCanonical(
      sample({
        id: "job-2",
        natural_key: "job-2",
        status: "applied",
        follow_up_at: "2026-08-01T00:00:00.000Z",
        score: 70,
      }),
    );

    const sendDigest = vi.fn().mockResolvedValue(undefined);
    const sendFollowUp = vi.fn().mockResolvedValue(undefined);

    const first = await runJobNotify({
      content,
      jobs,
      mailer: { sendDigest, sendFollowUp },
      now: new Date("2026-08-10T07:00:00.000Z"),
    });
    expect(first.digested).toBe(1);
    expect(first.followUps).toBe(1);
    expect(sendDigest).toHaveBeenCalledTimes(1);

    const second = await runJobNotify({
      content,
      jobs,
      mailer: { sendDigest, sendFollowUp },
      now: new Date("2026-08-10T07:05:00.000Z"),
    });
    expect(second.digested).toBe(0);
  });
});
