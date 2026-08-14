import {
  DeleteCommand,
  PutCommand,
  ScanCommand,
  type DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import type { ContentRepository } from "@portfolio/shared/ports";
import { createMultiTableContentRepository } from "../adapters/multi-table-content-repository";
import type { TableNames } from "../dynamo/tables";
import {
  aboutFixture,
  experienceFixtures,
  heroFixture,
  mediaFixtures,
  projectFixtures,
  resumeFixture,
  resumeLayoutFixtures,
  siteConfigFixture,
  skillFixtures,
  testimonialFixtures,
} from "../fixtures/content";

type Meta = "id" | "created_at" | "updated_at";

/** Strips entity metadata to produce the corresponding `*FormData` shape. */
function toForm<T extends { id: string; created_at: string; updated_at: string }>(
  entity: T,
): Omit<T, Meta> {
  const { id: _id, created_at: _created, updated_at: _updated, ...rest } = entity;
  return rest;
}

type WriteValues = Record<string, unknown>;

/** Drops null/undefined so absent attributes are stored instead of nulls. */
function writable(values: WriteValues): WriteValues {
  const out: WriteValues = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined) out[key] = value;
  }
  return out;
}

async function listIds(client: DynamoDBDocumentClient, table: string): Promise<string[]> {
  const ids: string[] = [];
  let cursor: Record<string, unknown> | undefined;
  do {
    const page = await client.send(
      new ScanCommand({
        TableName: table,
        ProjectionExpression: "id",
        ExclusiveStartKey: cursor,
      }),
    );
    for (const item of page.Items ?? []) {
      if (typeof item.id === "string") ids.push(item.id);
    }
    cursor = page.LastEvaluatedKey;
  } while (cursor);
  return ids;
}

async function clearTable(client: DynamoDBDocumentClient, table: string): Promise<void> {
  for (const id of await listIds(client, table)) {
    await client.send(new DeleteCommand({ TableName: table, Key: { id } }));
  }
}

/** Writes a list-entity row with the fixture's stable `id` (seed-only; not for admin inserts). */
async function putSeedRow(
  client: DynamoDBDocumentClient,
  table: string,
  row: WriteValues,
): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: table,
      Item: writable(row),
    }),
  );
}

/** Serializes a timestamped list row for DynamoDB (nulls omitted, id preserved). */
function timestampedSeedRow<
  T extends { id: string; created_at: string; updated_at: string },
>(row: T): WriteValues {
  return writable({ ...row });
}

/**
 * Seeds DynamoDB from static fixtures with **stable IDs** from `seed/content.json`.
 * Singletons are upserted via the repository; list tables are cleared then
 * written with explicit ids so re-runs converge without UUID churn.
 */
export async function seedDynamoFromFixtures(
  client: DynamoDBDocumentClient,
  tables: TableNames,
): Promise<void> {
  const repo: ContentRepository = createMultiTableContentRepository(client, tables);

  await repo.upsertHero(toForm(heroFixture));
  await repo.upsertAbout(toForm(aboutFixture));
  await repo.upsertSiteConfig(toForm(siteConfigFixture));
  await repo.upsertResume(toForm(resumeFixture));

  await clearTable(client, tables.experience);
  for (const row of experienceFixtures) {
    await putSeedRow(client, tables.experience, timestampedSeedRow(row));
  }

  await clearTable(client, tables.project);
  for (const row of projectFixtures) {
    await putSeedRow(client, tables.project, timestampedSeedRow(row));
  }

  await clearTable(client, tables.skill);
  for (const row of skillFixtures) {
    await putSeedRow(client, tables.skill, timestampedSeedRow(row));
  }

  await clearTable(client, tables.testimonial);
  for (const row of testimonialFixtures) {
    await putSeedRow(client, tables.testimonial, timestampedSeedRow(row));
  }

  await clearTable(client, tables.media);
  for (const row of mediaFixtures) {
    await putSeedRow(client, tables.media, writable({ ...row }));
  }

  await clearTable(client, tables.resumeLayout);
  for (const row of resumeLayoutFixtures) {
    await putSeedRow(client, tables.resumeLayout, timestampedSeedRow(row));
  }
}
