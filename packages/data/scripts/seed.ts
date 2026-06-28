/**
 * Seeds DynamoDB from `seed/content.json` (via fixtures). Regenerate that file
 * from admin CSV exports with `pnpm --filter @portfolio/data seed:generate`.
 *
 * Idempotent: singletons are upserted, list entities are cleared then
 * re-written with stable fixture ids, so re-running converges the tables to
 * the catalog without UUID churn. Targets the tables/region resolved from the
 * standard env (`DYNAMO_TABLE_PREFIX`/`AWS_REGION`, defaulting to `portfolio`
 * in eu-west-1) using the ambient AWS credentials.
 *
 * Errors propagate and exit non-zero — never silently swallow a failed write.
 */
import { createDynamoClient } from "../src/dynamo/client";
import { buildTableNames } from "../src/dynamo/tables";
import { seedDynamoFromFixtures } from "../src/seed/dynamo-seed";
import {
  experienceFixtures,
  mediaFixtures,
  projectFixtures,
  skillFixtures,
  testimonialFixtures,
} from "../src/fixtures/content";

async function main(): Promise<void> {
  const tables = buildTableNames();
  const client = createDynamoClient();
  console.log(`Seeding tables with prefix "${tables.content.replace(/-content$/, "")}"...`);

  await seedDynamoFromFixtures(client, tables);

  console.log("  hero, about, siteConfig, resume upserted");
  console.log(`  ${experienceFixtures.length} experience rows`);
  console.log(`  ${projectFixtures.length} project rows`);
  console.log(`  ${skillFixtures.length} skill rows`);
  console.log(`  ${testimonialFixtures.length} testimonial rows`);
  console.log(`  ${mediaFixtures.length} media rows`);
  console.log("Seed complete.");
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
