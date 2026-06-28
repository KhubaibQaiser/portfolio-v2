/**
 * Seeds DynamoDB from `seed/content.json` (via fixtures). Regenerate that file
 * from admin CSV exports with `pnpm --filter @portfolio/data seed:generate`.
 *
 * Idempotent: singletons are upserted, list entities are cleared then
 * re-inserted, so re-running converges the tables to the fixtures. Targets the
 * tables/region resolved from the standard env (`DYNAMO_TABLE_PREFIX`/`AWS_REGION`,
 * defaulting to `portfolio` in eu-west-1) using the ambient AWS credentials.
 *
 * Errors propagate and exit non-zero — never silently swallow a failed write.
 */
import { createMultiTableContentRepository } from "../src/adapters/multi-table-content-repository";
import { createDynamoClient } from "../src/dynamo/client";
import { buildTableNames } from "../src/dynamo/tables";
import {
  aboutFixture,
  experienceFixtures,
  heroFixture,
  mediaFixtures,
  projectFixtures,
  resumeFixture,
  siteConfigFixture,
  skillFixtures,
  testimonialFixtures,
} from "../src/fixtures/content";

type Meta = "id" | "created_at" | "updated_at";

/** Strips entity metadata to produce the corresponding `*FormData` shape. */
function toForm<T extends { id: string; created_at: string; updated_at: string }>(
  entity: T,
): Omit<T, Meta> {
  const { id: _id, created_at: _created, updated_at: _updated, ...rest } = entity;
  return rest;
}

/** Removes every row of a list entity so the seed can re-insert from scratch. */
async function clearList<T extends { id: string }>(
  list: () => Promise<T[]>,
  remove: (id: string) => Promise<void>,
): Promise<void> {
  const rows = await list();
  for (const row of rows) {
    await remove(row.id);
  }
}

async function main(): Promise<void> {
  const tables = buildTableNames();
  const repo = createMultiTableContentRepository(createDynamoClient(), tables);
  console.log(`Seeding tables with prefix "${tables.content.replace(/-content$/, "")}"...`);

  // Singletons — upsert is naturally idempotent.
  await repo.upsertHero(toForm(heroFixture));
  await repo.upsertAbout(toForm(aboutFixture));
  await repo.upsertSiteConfig(toForm(siteConfigFixture));
  await repo.upsertResume(toForm(resumeFixture));
  console.log("  hero, about, siteConfig, resume upserted");

  // List entities — clear then re-insert to stay idempotent across runs.
  await clearList(
    () => repo.getExperience(),
    (id) => repo.deleteExperience(id),
  );
  for (const experience of experienceFixtures) {
    await repo.insertExperience(toForm(experience));
  }
  console.log(`  ${experienceFixtures.length} experience rows`);

  await clearList(
    () => repo.getProjects(),
    (id) => repo.deleteProject(id),
  );
  for (const project of projectFixtures) {
    await repo.insertProject(toForm(project));
  }
  console.log(`  ${projectFixtures.length} project rows`);

  await clearList(
    () => repo.getSkills(),
    (id) => repo.deleteSkill(id),
  );
  await repo.batchUpsertSkills(skillFixtures.map((skill) => toForm(skill)));
  console.log(`  ${skillFixtures.length} skill rows`);

  await clearList(
    () => repo.getTestimonials(),
    (id) => repo.deleteTestimonial(id),
  );
  for (const testimonial of testimonialFixtures) {
    await repo.insertTestimonial(toForm(testimonial));
  }
  console.log(`  ${testimonialFixtures.length} testimonial rows`);

  await clearList(
    () => repo.getMedia(),
    (id) => repo.deleteMediaRow(id),
  );
  for (const media of mediaFixtures) {
    await repo.insertMedia({
      filename: media.filename,
      url: media.url,
      mime_type: media.mime_type,
      size: media.size,
      alt_text: media.alt_text,
    });
  }
  console.log(`  ${mediaFixtures.length} media rows`);

  console.log("Seed complete.");
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
