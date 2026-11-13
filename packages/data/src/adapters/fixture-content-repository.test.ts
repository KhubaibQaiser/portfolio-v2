import { beforeEach, describe, expect, it } from "vitest";
import { ContentConflictError } from "@portfolio/shared/concurrency";
import type { ContentRepository } from "@portfolio/shared/ports";
import { createFixtureContentRepository } from "./fixture-content-repository";

describe("FixtureContentRepository", () => {
  let repo: ContentRepository;

  beforeEach(() => {
    repo = createFixtureContentRepository();
  });

  it("returns the seeded singletons", async () => {
    expect((await repo.getHero()).greeting).toBe("Hi, my name is");
    expect((await repo.getSiteConfig()).email).toBe("hello@example.com");
    expect((await repo.getSiteConfig()).name).toBe("Alex Rivera");
    expect((await repo.getResume()).education).toHaveLength(1);
  });

  it("returns seeded resume layouts with a default", async () => {
    const layouts = await repo.getResumeLayouts();
    expect(layouts.length).toBeGreaterThanOrEqual(2);
    expect(layouts.some((layout) => layout.is_default)).toBe(true);
    expect(layouts.some((layout) => layout.component_key === "modern-blue")).toBe(true);
  });

  it("returns experience sorted by recency (most recent first)", async () => {
    const rows = await repo.getExperience();
    expect(rows[0]?.company).toBe("Northwind Labs");
    expect(rows.at(-1)?.company).toBe("Fabrikam Education");
  });

  it("returns only featured projects, ordered by sort_order", async () => {
    const featured = await repo.getFeaturedProjects();
    expect(featured.every((p) => p.is_featured)).toBe(true);
    // Contoso Analytics Dashboard (sort_order 2) is not featured in seed/content.json.
    expect(featured.map((p) => p.sort_order)).toEqual([0, 1, 3, 4]);
  });

  it("increments revisions and rejects stale writes", async () => {
    const hero = await repo.getHero();
    await repo.upsertHero({ headline: "Updated headline" }, hero.revision);
    expect((await repo.getHero()).revision).toBe(hero.revision + 1);

    await expect(
      repo.upsertHero({ headline: "Stale headline" }, hero.revision),
    ).rejects.toBeInstanceOf(ContentConflictError);
  });

  it("looks up a project by slug", async () => {
    const project = await repo.getProjectBySlug("contoso-analytics");
    expect(project?.title).toBe("Contoso Analytics Dashboard");
    expect(await repo.getProjectBySlug("does-not-exist")).toBeNull();
  });

  it("hides draft projects from public reads until published", async () => {
    const [seed] = await repo.getProjects();
    const { id: _id, created_at: _c, updated_at: _u, revision: _r, ...values } = seed!;
    const draft = await repo.insertProject({
      ...values,
      slug: "draft-only",
      is_featured: true,
      status: "draft",
    });

    expect((await repo.getProjects()).some((p) => p.slug === "draft-only")).toBe(false);
    expect((await repo.getFeaturedProjects()).some((p) => p.slug === "draft-only")).toBe(
      false,
    );
    expect(await repo.getProjectBySlug("draft-only")).toBeNull();
    expect((await repo.getAllProjects()).some((p) => p.slug === "draft-only")).toBe(true);

    await repo.updateProject(draft.id, { status: "published" }, draft.revision);
    expect((await repo.getProjectBySlug("draft-only"))?.slug).toBe("draft-only");
  });

  it("stores and updates media alt text", async () => {
    const row = await repo.insertMedia({
      filename: "hero-background.webp",
      url: "https://cdn.example.com/hero-background.webp",
      mime_type: "image/webp",
      size: 12,
      alt_text: "hero background",
    });
    expect(row.alt_text).toBe("hero background");
    await repo.updateMedia(row.id, { alt_text: "Hero portrait" });
    expect((await repo.getMediaById(row.id)).alt_text).toBe("Hero portrait");
  });

  it("isolates state between instances", async () => {
    await repo.insertTestimonial({
      full_name: "Test User",
      profile_url: "https://www.linkedin.com/in/example/",
      role_title: "CEO at Acme",
      recommended_at: "01-01-2025",
      description: "Great engineer.",
      linkedin_url:
        "https://www.linkedin.com/in/example/details/recommendations/?detailScreenTabIndex=0",
      avatar_url: null,
    });
    expect(await repo.getTestimonials()).toHaveLength(4);

    const fresh = createFixtureContentRepository();
    expect(await fresh.getTestimonials()).toHaveLength(3);
  });

  it("returns testimonials sorted by recommended_at descending", async () => {
    const rows = await repo.getTestimonials();
    expect(rows[0]?.full_name).toBe("Jordan Lee");
    expect(rows.at(-1)?.full_name).toBe("Riley Chen");
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
      show_in_resume: true,
      show_on_site: true,
    });
    expect(created.id).toBeTruthy();

    await repo.updateExperience(created.id, { role: "Principal Engineer" });
    expect((await repo.getExperienceById(created.id)).role).toBe("Principal Engineer");

    await repo.deleteExperience(created.id);
    await expect(repo.getExperienceById(created.id)).rejects.toThrow(
      /Experience not found/,
    );
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
      layout_id: null,
      applied_changes: [],
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

  it("rejects a second project insert with the same explicit id", async () => {
    const [seed] = await repo.getProjects();
    const { id: _id, created_at: _c, updated_at: _u, revision: _r, ...form } = seed!;
    await repo.insertProject({ ...form, slug: "dup-id" }, { id: "slug-dup-id" });

    await expect(
      repo.insertProject({ ...form, slug: "dup-id" }, { id: "slug-dup-id" }),
    ).rejects.toBeInstanceOf(ContentConflictError);
  });
});
