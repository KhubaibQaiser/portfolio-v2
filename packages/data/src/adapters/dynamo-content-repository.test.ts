import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { beforeAll, describe, expect, it } from "vitest";
import type { ContentRepository } from "@portfolio/shared/ports";
import { createDynamoContentRepository } from "./dynamo-content-repository";
import { ensureTable } from "../dynamo/create-table";
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

describe.skipIf(!endpoint)("DynamoContentRepository (integration)", () => {
  let repo: ContentRepository;

  beforeAll(async () => {
    const table = `portfolio-test-${Date.now()}`;
    const base = new DynamoDBClient({
      endpoint,
      region: "us-east-1",
      credentials: { accessKeyId: "local", secretAccessKey: "local" },
    });
    await ensureTable(base, table);
    const doc = DynamoDBDocumentClient.from(base, {
      marshallOptions: { removeUndefinedValues: true },
    });
    repo = createDynamoContentRepository(doc, table);
  });

  it("upserts the hero singleton (create then partial patch)", async () => {
    await repo.upsertHero(heroForm);
    expect((await repo.getHero()).name).toBe("Khubaib Qaiser");

    await repo.upsertHero({ name: "Updated Name" });
    const hero = await repo.getHero();
    expect(hero.name).toBe("Updated Name");
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
      usage: { costUsd: 0.3 },
      resume_pdf_url: null,
      cover_letter_pdf_url: null,
      archived_at: null,
      deleted_at: null,
    });

    expect(await repo.sumDailyUsage("user-1")).toEqual({
      totalUsd: 0.3,
      count: 1,
    });
    expect(await repo.sumDailyUsage("user-2")).toEqual({
      totalUsd: 0,
      count: 0,
    });
  });
});
