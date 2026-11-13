import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { beforeAll, describe, expect, it } from "vitest";
import { ContentConflictError } from "@portfolio/shared/concurrency";
import type { ContentRepository } from "@portfolio/shared/ports";
import type { ResumeGenerationInsert } from "@portfolio/shared/types";
import { createMultiTableContentRepository } from "./multi-table-content-repository";
import { ensureTables } from "../dynamo/create-table";
import { buildTableNames } from "../dynamo/tables";
import { experienceFixtures, heroFixture, projectFixtures } from "../fixtures/content";

// Integration suite — requires DynamoDB Local. Skipped unless the endpoint is
// set, so `pnpm test` stays green without Docker. Run with:
//   docker compose -f docker-compose.dev.yml up -d
//   DYNAMODB_LOCAL_ENDPOINT=http://localhost:8000 pnpm test
const endpoint = process.env.DYNAMODB_LOCAL_ENDPOINT;

const { id: _hId, created_at: _hC, updated_at: _hU, ...heroForm } = heroFixture;
const {
  id: _eId,
  created_at: _eC,
  updated_at: _eU,
  ...experienceForm
} = experienceFixtures[0]!;
const {
  id: _pId,
  created_at: _pC,
  updated_at: _pU,
  ...projectForm
} = projectFixtures[0]!;

describe.skipIf(!endpoint)("MultiTableContentRepository (integration)", () => {
  let repo: ContentRepository;

  beforeAll(async () => {
    const names = buildTableNames(`portfolio-test-${Date.now()}`);
    const base = new DynamoDBClient({
      endpoint,
      region: "us-east-1",
      credentials: { accessKeyId: "local", secretAccessKey: "local" },
    });
    await ensureTables(base, names);
    const doc = DynamoDBDocumentClient.from(base, {
      marshallOptions: { removeUndefinedValues: true },
    });
    repo = createMultiTableContentRepository(doc, names);
  });

  it("upserts the hero singleton (create then partial patch)", async () => {
    await repo.upsertHero(heroForm);
    expect((await repo.getHero()).headline).toBe(heroForm.headline);

    await repo.upsertHero({ headline: "Updated headline" });
    const hero = await repo.getHero();
    expect(hero.headline).toBe("Updated headline");
    expect(hero.greeting).toBe(heroForm.greeting);
  });

  it("creates, reads, updates, and deletes an experience", async () => {
    const created = await repo.insertExperience(experienceForm);
    expect(created.id).toBeTruthy();
    expect(created.end_date).toBeNull();

    const byId = await repo.getExperienceById(created.id);
    expect(byId.company).toBe(experienceForm.company);

    await repo.updateExperience(created.id, { role: "Principal Engineer" });
    expect((await repo.getExperienceById(created.id)).role).toBe("Principal Engineer");

    await repo.deleteExperience(created.id);
    await expect(repo.getExperienceById(created.id)).rejects.toThrow();
  });

  it("looks up a project via the slug GSI", async () => {
    const created = await repo.insertProject(projectForm);
    const bySlug = await repo.getProjectBySlug(projectForm.slug);
    expect(bySlug?.id).toBe(created.id);
    expect(bySlug?.cover_url).toBeNull();
    expect(await repo.getProjectBySlug("missing-slug")).toBeNull();
  });

  it("inserts a project with a caller-chosen id only once (atomic uniqueness)", async () => {
    const id = `slug-race-${Date.now()}`;
    const attempts = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        repo.insertProject({ ...projectForm, slug: id }, { id }),
      ),
    );

    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(1);
    for (const a of attempts.filter((a) => a.status === "rejected")) {
      expect((a as PromiseRejectedResult).reason).toBeInstanceOf(ContentConflictError);
    }
    expect((await repo.getProjectById(id)).id).toBe(id);
  });

  it("stages, hides and clears a pending project revision", async () => {
    const slug = `pending-${Date.now()}`;
    const created = await repo.insertProject({
      ...projectForm,
      slug,
      status: "published",
    });
    const pending = {
      values: { title: "Staged title" },
      base_revision: created.revision,
      proposed_at: new Date().toISOString(),
      proposed_by: "client-1",
    };

    await repo.updateProject(created.id, { pending_revision: pending }, created.revision);

    const admin = await repo.getProjectById(created.id);
    expect(admin.pending_revision).toEqual(pending);
    expect(admin.title).toBe(created.title);
    expect(await repo.getProjectBySlug(slug)).not.toHaveProperty("pending_revision");
    expect((await repo.getProjects()).find((p) => p.slug === slug)).not.toHaveProperty(
      "pending_revision",
    );

    await expect(
      repo.updateProject(created.id, { pending_revision: pending }, created.revision),
    ).rejects.toBeInstanceOf(ContentConflictError);

    await repo.updateProject(
      created.id,
      { ...pending.values, pending_revision: null },
      admin.revision,
    );
    const applied = await repo.getProjectById(created.id);
    expect(applied.title).toBe("Staged title");
    expect(applied.pending_revision).toBeUndefined();
  });

  it("sums daily usage from resume generations via the by-user GSI", async () => {
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
      usage: { costUsd: 0.3 },
      resume_pdf_url: null,
      cover_letter_pdf_url: null,
      layout_id: null,
      applied_changes: [],
      archived_at: null,
      deleted_at: null,
    });

    expect(await repo.sumDailyUsage("user-1")).toEqual({ totalUsd: 0.3, count: 1 });
    expect(await repo.sumDailyUsage("user-2")).toEqual({ totalUsd: 0, count: 0 });
  });

  it("lists generation history newest-first via the recent GSI", async () => {
    const base: Omit<ResumeGenerationInsert, "company" | "role"> = {
      created_by: "user-3",
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
      usage: { costUsd: 0.1 },
      resume_pdf_url: null,
      cover_letter_pdf_url: null,
      layout_id: null,
      applied_changes: [],
      archived_at: null,
      deleted_at: null,
    };

    const older = await repo.insertResumeGeneration({
      ...base,
      company: "Older",
      role: "A",
    });
    await new Promise((resolve) => setTimeout(resolve, 5)); // distinct created_at
    const newer = await repo.insertResumeGeneration({
      ...base,
      company: "Newer",
      role: "B",
    });

    const history = await repo.getResumeGenerations({ limit: 10 });
    const ids = history.map((r) => r.id);
    expect(ids).toContain(older.id);
    expect(ids.indexOf(newer.id)).toBeLessThan(ids.indexOf(older.id));

    expect(await repo.getResumeGenerations({ limit: 1 })).toHaveLength(1);
  });

  it("reads job preferences after Dynamo omitted null attributes", async () => {
    await repo.upsertJobPreferences({
      recommended_job_id: null,
      jobspipe_last_search_date: null,
      default_layout_id: null,
      salary_floor: null,
    });
    const prefs = await repo.getJobPreferences();
    expect(prefs.recommended_job_id).toBeNull();
    expect(prefs.jobspipe_last_search_date).toBeNull();
    expect(prefs.default_layout_id).toBeNull();
    expect(prefs.salary_floor).toBeNull();
    expect(prefs.title_families.length).toBeGreaterThan(0);
  });
});
