import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  type DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import type {
  JobBoardRepository,
  JobQueryByStatusOptions,
  JobQueryPage,
  JobStatusCounts,
} from "@portfolio/shared/ports";
import {
  HITL_STATUSES,
  jobPostingRowSchema,
  jobStatusEnum,
  type JobPosting,
  type JobStatus,
} from "@portfolio/shared/schemas";

const GSI = "by-status-posted";

function parseRow(item: Record<string, unknown>): JobPosting {
  return jobPostingRowSchema.parse(item);
}

function emptyCounts(): JobStatusCounts {
  return Object.fromEntries(jobStatusEnum.options.map((status) => [status, 0])) as JobStatusCounts;
}

async function claimUnsetTimestamp(
  client: DynamoDBDocumentClient,
  table: string,
  id: string,
  attribute: "notified_at" | "digested_at",
  timestamp: string,
): Promise<boolean> {
  try {
    await client.send(
      new UpdateCommand({
        TableName: table,
        Key: { id },
        ConditionExpression: `attribute_not_exists(#attr) OR #attr = :null`,
        UpdateExpression: "SET #attr = :ts, updated_at = :ts",
        ExpressionAttributeNames: { "#attr": attribute },
        ExpressionAttributeValues: { ":ts": timestamp, ":null": null },
      }),
    );
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      return false;
    }
    throw error;
  }
}

function mergeSources(existing: JobPosting, incoming: JobPosting): JobPosting["sources"] {
  const seen = new Set(existing.sources.map((s) => `${s.source}:${s.source_id}`));
  const merged = [...existing.sources];
  for (const source of incoming.sources) {
    const key = `${source.source}:${source.source_id}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(source);
    }
  }
  return merged.slice(0, 12);
}

export function createDynamoJobBoardRepository(
  client: DynamoDBDocumentClient,
  table: string,
): JobBoardRepository {
  return {
    async getById(id) {
      const result = await client.send(new GetCommand({ TableName: table, Key: { id } }));
      return result.Item ? parseRow(result.Item) : null;
    },

    async upsertCanonical(incoming) {
      const existingResult = await client.send(
        new GetCommand({ TableName: table, Key: { id: incoming.id } }),
      );
      const timestamp = new Date().toISOString();
      if (!existingResult.Item) {
        const created: JobPosting = {
          ...incoming,
          created_at: timestamp,
          updated_at: timestamp,
        };
        await client.send(new PutCommand({ TableName: table, Item: created }));
        return created;
      }
      const existing = parseRow(existingResult.Item);
      const hitl = HITL_STATUSES.has(existing.status);
      const next: JobPosting = {
        ...existing,
        company: incoming.company,
        company_domain: incoming.company_domain ?? existing.company_domain,
        title: incoming.title,
        location: incoming.location,
        remote: incoming.remote,
        salary_min: incoming.salary_min ?? existing.salary_min,
        salary_max: incoming.salary_max ?? existing.salary_max,
        salary_currency: incoming.salary_currency ?? existing.salary_currency,
        jd_text:
          incoming.jd_text.length > existing.jd_text.length
            ? incoming.jd_text
            : existing.jd_text,
        sources: mergeSources(existing, incoming),
        score: incoming.score,
        band: incoming.band,
        gaps: incoming.gaps,
        posted_at: incoming.posted_at,
        status: hitl ? existing.status : existing.status,
        notified_at: existing.notified_at,
        digested_at: existing.digested_at,
        follow_up_at: existing.follow_up_at,
        snooze_count: existing.snooze_count,
        generation_id: existing.generation_id,
        recruiter_message: existing.recruiter_message,
        updated_at: timestamp,
      };
      await client.send(new PutCommand({ TableName: table, Item: next }));
      return next;
    },

    async update(id, patch) {
      const existing = await client.send(
        new GetCommand({ TableName: table, Key: { id } }),
      );
      if (!existing.Item) return null;
      const current = parseRow(existing.Item);
      const next: JobPosting = {
        ...current,
        ...patch,
        id: current.id,
        updated_at: new Date().toISOString(),
      };
      await client.send(new PutCommand({ TableName: table, Item: next }));
      return next;
    },

    async claimNotify(id, notifiedAt) {
      return claimUnsetTimestamp(client, table, id, "notified_at", notifiedAt);
    },

    async claimDigest(id, digestedAt) {
      return claimUnsetTimestamp(client, table, id, "digested_at", digestedAt);
    },

    async queryByStatus(options: JobQueryByStatusOptions): Promise<JobQueryPage> {
      const limit = options.limit ?? 50;
      const items: JobPosting[] = [];
      let exclusiveStartKey: Record<string, unknown> | undefined = options.cursor
        ? {
            id: options.cursor.id,
            status: options.cursor.status,
            posted_at: options.cursor.posted_at,
          }
        : undefined;

      // Band is a FilterExpression, so keep paging until the page is full or
      // the status partition is exhausted (personal job volume is small).
      while (items.length < limit) {
        const result = await client.send(
          new QueryCommand({
            TableName: table,
            IndexName: GSI,
            KeyConditionExpression: "#status = :status",
            ExpressionAttributeNames: options.band
              ? { "#status": "status", "#band": "band" }
              : { "#status": "status" },
            ExpressionAttributeValues: options.band
              ? { ":status": options.status, ":band": options.band }
              : { ":status": options.status },
            FilterExpression: options.band ? "#band = :band" : undefined,
            ScanIndexForward: false,
            Limit: Math.max(limit - items.length, 1) * (options.band ? 4 : 1),
            ExclusiveStartKey: exclusiveStartKey,
          }),
        );
        for (const item of result.Items ?? []) {
          items.push(parseRow(item as Record<string, unknown>));
          if (items.length >= limit) break;
        }
        exclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
        if (!exclusiveStartKey) break;
      }

      const last = items.at(-1);
      return {
        items: items.slice(0, limit),
        nextCursor:
          items.length >= limit && last
            ? { status: last.status, posted_at: last.posted_at, id: last.id }
            : null,
      };
    },

    async countByStatus(): Promise<JobStatusCounts> {
      const counts = emptyCounts();
      await Promise.all(
        jobStatusEnum.options.map(async (status: JobStatus) => {
          let total = 0;
          let exclusiveStartKey: Record<string, unknown> | undefined;
          do {
            const result = await client.send(
              new QueryCommand({
                TableName: table,
                IndexName: GSI,
                KeyConditionExpression: "#status = :status",
                ExpressionAttributeNames: { "#status": "status" },
                ExpressionAttributeValues: { ":status": status },
                Select: "COUNT",
                ExclusiveStartKey: exclusiveStartKey,
              }),
            );
            total += result.Count ?? 0;
            exclusiveStartKey = result.LastEvaluatedKey as
              | Record<string, unknown>
              | undefined;
          } while (exclusiveStartKey);
          counts[status] = total;
        }),
      );
      return counts;
    },
  };
}
