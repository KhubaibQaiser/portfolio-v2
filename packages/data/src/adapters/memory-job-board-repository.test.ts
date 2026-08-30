import { describe, expect, it } from "vitest";
import { bandForScore, type JobPosting } from "@portfolio/shared/schemas";
import { createMemoryJobBoardRepository } from "./memory-job-board-repository";

function sample(overrides: Partial<JobPosting> = {}): JobPosting {
  const now = "2026-08-01T00:00:00.000Z";
  return {
    id: "abc123",
    natural_key: "abc123",
    company: "Acme",
    company_domain: "acme.com",
    title: "Staff Software Engineer",
    location: "Remote",
    remote: true,
    salary_min: 180000,
    salary_max: 220000,
    salary_currency: "USD",
    jd_text: "TypeScript AWS",
    sources: [
      {
        source: "remotive",
        source_id: "1",
        apply_url: "https://example.com/jobs/1",
      },
    ],
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

describe("memory job board repository", () => {
  it("upserts without resetting HITL status or re-arming notify", async () => {
    const repo = createMemoryJobBoardRepository();
    await repo.upsertCanonical(sample());
    await repo.update("abc123", {
      status: "applied",
      notified_at: "2026-08-02T00:00:00.000Z",
    });
    const next = await repo.upsertCanonical(
      sample({ score: 91, jd_text: "TypeScript AWS React much longer description" }),
    );
    expect(next.status).toBe("applied");
    expect(next.notified_at).toBe("2026-08-02T00:00:00.000Z");
    expect(next.jd_text).toContain("much longer");
  });

  it("claims notify once", async () => {
    const repo = createMemoryJobBoardRepository();
    await repo.upsertCanonical(sample());
    expect(await repo.claimNotify("abc123", "2026-08-02T00:00:00.000Z")).toBe(true);
    expect(await repo.claimNotify("abc123", "2026-08-03T00:00:00.000Z")).toBe(false);
  });

  it("claims digest once", async () => {
    const repo = createMemoryJobBoardRepository();
    await repo.upsertCanonical(sample());
    expect(await repo.claimDigest("abc123", "2026-08-02T00:00:00.000Z")).toBe(true);
    expect(await repo.claimDigest("abc123", "2026-08-03T00:00:00.000Z")).toBe(false);
  });

  it("counts by status and filters by band", async () => {
    const repo = createMemoryJobBoardRepository();
    await repo.upsertCanonical(sample({ id: "a", natural_key: "a", score: 88 }));
    await repo.upsertCanonical(
      sample({
        id: "b",
        natural_key: "b",
        score: 40,
        band: bandForScore(40),
        status: "reviewing",
      }),
    );
    await repo.upsertCanonical(
      sample({
        id: "c",
        natural_key: "c",
        score: 91,
        band: bandForScore(91),
        posted_at: "2026-08-02T00:00:00.000Z",
      }),
    );

    expect(await repo.countByStatus()).toEqual({
      new: 2,
      reviewing: 1,
      applied: 0,
      discarded: 0,
      snoozed: 0,
      closed: 0,
    });

    const page = await repo.queryByStatus({ status: "new", band: "excellent" });
    expect(page.items.map((row) => row.id)).toEqual(["c"]);
  });
});
