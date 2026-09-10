/**
 * Seeds DynamoDB from seed JSON (via fixtures). Regenerate private local seed
 * from admin CSV exports with `pnpm --filter @portfolio/data seed:generate`
 * (writes `seed/content.local.json` by default).
 *
 * Idempotent: singletons are upserted, list entities are cleared then
 * re-written with stable fixture ids. Targets tables/region from
 * `DYNAMO_TABLE_PREFIX` / `AWS_REGION` using ambient AWS credentials.
 *
 * Usage:
 *   pnpm --filter @portfolio/data seed -- --file seed/content.local.json
 *   pnpm --filter @portfolio/data seed -- --i-understand-this-wipes-tables
 *
 * Refuses prefix `portfolio` (typical production) unless the wipe flag is set.
 */
import { resolve } from "node:path";
import { createDynamoClient } from "../src/dynamo/client";
import { buildTableNames, resolveTablePrefix } from "../src/dynamo/tables";
import { seedDynamoFromFixtures } from "../src/seed/dynamo-seed";
import {
  committedSeedPath,
  loadSeedBundle,
} from "../src/fixtures/load-seed";

function parseArgs(argv: string[]): {
  file: string;
  wipeConfirmed: boolean;
} {
  let file = committedSeedPath();
  let wipeConfirmed = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--file") {
      const next = argv[i + 1];
      if (!next) throw new Error("--file requires a path");
      file = resolve(next);
      i++;
      continue;
    }
    if (arg === "--i-understand-this-wipes-tables") {
      wipeConfirmed = true;
      continue;
    }
    if (arg.startsWith("--file=")) {
      file = resolve(arg.slice("--file=".length));
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return { file, wipeConfirmed };
}

async function main(): Promise<void> {
  const { file, wipeConfirmed } = parseArgs(process.argv.slice(2));
  const tables = buildTableNames();
  const prefix = resolveTablePrefix();
  const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "eu-west-1";

  console.log(`Seed file: ${file}`);
  console.log(`Target region: ${region}`);
  console.log(`Table prefix: ${prefix}`);

  if (prefix === "portfolio" && !wipeConfirmed) {
    console.error(
      "Refusing to seed table prefix \"portfolio\" (typical production).\n" +
        "This command CLEARS list tables then rewrites them from the seed file.\n" +
        "If you really intend to wipe those tables, re-run with:\n" +
        "  --i-understand-this-wipes-tables\n" +
        "Prefer seeding a non-prod prefix, or pass --file seed/content.local.json for your private CV.",
    );
    process.exit(1);
  }

  const bundle = loadSeedBundle(file);
  const client = createDynamoClient();
  console.log(`Seeding tables with prefix "${prefix}"...`);

  await seedDynamoFromFixtures(client, tables, bundle);

  console.log("  hero, about, siteConfig, resume upserted");
  console.log(`  ${bundle.experienceFixtures.length} experience rows`);
  console.log(`  ${bundle.projectFixtures.length} project rows`);
  console.log(`  ${bundle.skillFixtures.length} skill rows`);
  console.log(`  ${bundle.testimonialFixtures.length} testimonial rows`);
  console.log(`  ${bundle.mediaFixtures.length} media rows`);
  console.log(`  ${bundle.resumeLayoutFixtures.length} resume layout rows`);
  console.log("Seed complete.");
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
