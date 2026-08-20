import type { CreateTableCommandInput } from "@aws-sdk/client-dynamodb";

/**
 * Multi-table model. Each aggregate gets its own physical table with a clean,
 * human-readable key schema (no opaque composite keys), so the data is easy to
 * browse in the console and manage from the admin. Table names share a single
 * prefix (`DYNAMO_TABLE_PREFIX`, default `portfolio`) and a fixed suffix per
 * entity, so the apps only need one env var and the infra/local creation agree.
 */
export const TABLE_SUFFIXES = {
  /** Singletons (hero, about, site-config, resume), keyed by `section`. */
  content: "content",
  experience: "experience",
  project: "project",
  skill: "skill",
  testimonial: "testimonial",
  resumeVariant: "resume-variant",
  resumeLayout: "resume-layout",
  media: "media",
  resumeGeneration: "resume-generation",
  /** Rate-limiter counters, keyed by `pk`/`sk` with a `ttl` sweep. */
  rateLimit: "rate-limit",
  /** Chat response cache entries, keyed by `pk` with a `ttl` sweep. */
  chatCache: "chat-cache",
  /** Async PDF render-job status (admin download flow), keyed by `id` with a `ttl` sweep. */
  renderJob: "render-job",
  /** Async AI generation-job status (admin generate flow), keyed by `id` with a `ttl` sweep. */
  generationJob: "generation-job",
} as const;

export type TableKey = keyof typeof TABLE_SUFFIXES;
export type TableNames = Record<TableKey, string>;

const DEFAULT_PREFIX = "portfolio";

/** Reads the table-name prefix from the environment (defaults to `portfolio`). */
export function resolveTablePrefix(): string {
  const prefix = process.env.DYNAMO_TABLE_PREFIX;
  return prefix && prefix.length > 0 ? prefix : DEFAULT_PREFIX;
}

/** Builds the concrete table names from a prefix (`<prefix>-<suffix>`). */
export function buildTableNames(prefix = resolveTablePrefix()): TableNames {
  return Object.fromEntries(
    Object.entries(TABLE_SUFFIXES).map(([key, suffix]) => [key, `${prefix}-${suffix}`]),
  ) as TableNames;
}

const PAY_PER_REQUEST = "PAY_PER_REQUEST" as const;

/** Single-attribute primary key (HASH only) on a string attribute. */
function simpleTable(tableName: string, hashKey: string): CreateTableCommandInput {
  return {
    TableName: tableName,
    BillingMode: PAY_PER_REQUEST,
    AttributeDefinitions: [{ AttributeName: hashKey, AttributeType: "S" }],
    KeySchema: [{ AttributeName: hashKey, KeyType: "HASH" }],
  };
}

/**
 * CreateTable inputs for every table. Used by `ensureTables` for local dev and
 * tests against DynamoDB Local; production tables are owned by the CDK DataStack
 * (which must keep this schema in sync).
 */
export function buildCreateTableInputs(
  names: TableNames = buildTableNames(),
): CreateTableCommandInput[] {
  return [
    simpleTable(names.content, "section"),
    simpleTable(names.experience, "id"),
    {
      TableName: names.project,
      BillingMode: PAY_PER_REQUEST,
      AttributeDefinitions: [
        { AttributeName: "id", AttributeType: "S" },
        { AttributeName: "slug", AttributeType: "S" },
      ],
      KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
      GlobalSecondaryIndexes: [
        {
          IndexName: "by-slug",
          KeySchema: [{ AttributeName: "slug", KeyType: "HASH" }],
          Projection: { ProjectionType: "ALL" },
        },
      ],
    },
    simpleTable(names.skill, "id"),
    simpleTable(names.testimonial, "id"),
    simpleTable(names.resumeVariant, "id"),
    simpleTable(names.resumeLayout, "id"),
    simpleTable(names.media, "id"),
    {
      TableName: names.resumeGeneration,
      BillingMode: PAY_PER_REQUEST,
      AttributeDefinitions: [
        { AttributeName: "id", AttributeType: "S" },
        { AttributeName: "created_by", AttributeType: "S" },
        { AttributeName: "created_at", AttributeType: "S" },
        { AttributeName: "recent_pk", AttributeType: "S" },
      ],
      KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
      GlobalSecondaryIndexes: [
        {
          // Per-user usage window (cost cap).
          IndexName: "by-user",
          KeySchema: [
            { AttributeName: "created_by", KeyType: "HASH" },
            { AttributeName: "created_at", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
        {
          // Global recency feed for the history list (constant partition key).
          IndexName: "recent",
          KeySchema: [
            { AttributeName: "recent_pk", KeyType: "HASH" },
            { AttributeName: "created_at", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
      ],
    },
    {
      TableName: names.rateLimit,
      BillingMode: PAY_PER_REQUEST,
      AttributeDefinitions: [
        { AttributeName: "pk", AttributeType: "S" },
        { AttributeName: "sk", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "pk", KeyType: "HASH" },
        { AttributeName: "sk", KeyType: "RANGE" },
      ],
    },
    simpleTable(names.chatCache, "pk"),
    simpleTable(names.renderJob, "id"),
    simpleTable(names.generationJob, "id"),
  ];
}
