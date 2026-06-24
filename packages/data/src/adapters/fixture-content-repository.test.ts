import { beforeEach, describe, expect, it } from "vitest";
import type { ContentRepository } from "@portfolio/shared/ports";
import { createFixtureContentRepository } from "./fixture-content-repository";

describe("FixtureContentRepository", () => {
  let repo: ContentRepository;

  beforeEach(() => {
    repo = createFixtureContentRepository();
  });

  it("returns the seeded singletons", async () => {
    expect((await repo.getHero()).name).toBe("Khubaib Qaiser");
    expect((await repo.getSiteConfig()).email).toBe("khubaib.dev@gmail.com");
    expect((await repo.getResume()).education).toHaveLength(1);
  });

  it("returns experience sorted by recency (most recent first)", async () => {
    const rows = await repo.getExperience();
    expect(rows[0]?.company).toBe("Shopsense AI");
    expect(rows.at(-1)?.company).toBe("Knowledge Platform");
  });

  it("returns only featured projects, ordered by sort_order", async () => {
    const featured = await repo.getFeaturedProjects();
    expect(featured.every((p) => p.is_featured)).toBe(true);
    expect(featured.map((p) => p.sort_order)).toEqual([0, 1, 2, 3]);
  });

  it("looks up a project by slug", async () => {
    const project = await repo.getProjectBySlug("achieve-web-platform");
    expect(project?.title).toBe("Achieve Web Platform");
    expect(await repo.getProjectBySlug("does-not-exist")).toBeNull();
  });

  it("isolates state between instances", async () => {
    await repo.insertTestimonial({
      quote: "Great engineer.",
      author_name: "Test",
      author_title: "CEO",
      company: "Acme",
      avatar_url: null,
      sort_order: 99,
    });
    expect(await repo.getTestimonials()).toHaveLength(4);

    const fresh = createFixtureContentRepository();
    expect(await fresh.getTestimonials()).toHaveLength(3);
  });

  it("creates, updates, and deletes an experience row", async () => {
    const created = await repo.insertExperience({
      company: "New Co",
      role: "Staff Engineer",
      location: "Remote",
      location_type: "remote",
      contract_type: "full_time",
      start_date: "Jan 2025",
      end_date: null,
      description: "Did things",
      tech_tags: ["TypeScript"],
      logo_url: null,
      company_url: null,
      sort_order: 0,
    });
    expect(created.id).toBeTruthy();

    await repo.updateExperience(created.id, { role: "Principal Engineer" });
    expect((await repo.getExperienceById(created.id)).role).toBe("Principal Engineer");

    await repo.deleteExperience(created.id);
    await expect(repo.getExperienceById(created.id)).rejects.toThrow(
      /Experience not found/,
    );
  });

  it("syncs the companies count from unique experience companies", async () => {
    await repo.syncCompaniesCountFromExperience();
    expect((await repo.getAbout()).companies_count).toBe(6);
  });

  it("sums daily usage from resume generations for a user", async () => {
    await repo.insertResumeGeneration({
      created_by: "user-1",
      company: "Acme",
      role: "Engineer",
      hiring_manager: null,
      language: "en",
      tone: "formal",
      length: "standard",
      jd_text: "JD",
      jd_source: "paste",
      jd_pdf_url: null,
      model: "test-model",
      fallback_used: false,
      resume: null,
      cover_letter: null,
      ats: null,
      usage: { costUsd: 0.25 },
      resume_pdf_url: null,
      cover_letter_pdf_url: null,
      archived_at: null,
      deleted_at: null,
    });

    expect(await repo.sumDailyUsage("user-1")).toEqual({
      totalUsd: 0.25,
      count: 1,
    });
    expect(await repo.sumDailyUsage("user-2")).toEqual({
      totalUsd: 0,
      count: 0,
    });
  });
});
