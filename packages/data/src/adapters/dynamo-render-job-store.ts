import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  type DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import type { RenderJob, RenderJobInsert, RenderJobStore } from "@portfolio/shared/ports";

/** Jobs are request-scoped artifacts; 1 hour is comfortably above any
 * realistic poll duration (the worker itself has its own multi-minute
 * budget), so a forgotten job just disappears instead of accumulating. */
const TTL_SEC = 60 * 60;

type RenderJobItem = RenderJob & { id: string; ttl: number };

function fromItem(item: Record<string, unknown>): RenderJob {
  const { id: _id, ttl: _ttl, ...job } = item as RenderJobItem;
  return job;
}

/**
 * DynamoDB-backed {@link RenderJobStore}. A single item per job, hash-keyed by
 * `id` (the job id), with a `ttl` attribute so stale jobs sweep themselves —
 * no manual cleanup, consistent with the rate-limit/chat-cache tables.
 */
export function createDynamoRenderJobStore(
  client: DynamoDBDocumentClient,
  table: string,
): RenderJobStore {
  return {
    async create(job: RenderJobInsert): Promise<RenderJob> {
      const record: RenderJob = {
        ...job,
        status: "queued",
        objectKey: null,
        error: null,
        fitReport: null,
        createdAt: Date.now(),
      };
      await client.send(
        new PutCommand({
          TableName: table,
          Item: {
            id: job.jobId,
            ...record,
            ttl: Math.floor(record.createdAt / 1000) + TTL_SEC,
          },
        }),
      );
      return record;
    },

    async get(jobId: string): Promise<RenderJob | null> {
      const result = await client.send(
        new GetCommand({ TableName: table, Key: { id: jobId } }),
      );
      return result.Item ? fromItem(result.Item) : null;
    },

    async markRendering(jobId: string): Promise<void> {
      await client.send(
        new UpdateCommand({
          TableName: table,
          Key: { id: jobId },
          UpdateExpression: "SET #status = :status",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: { ":status": "rendering" },
        }),
      );
    },

    async markReady(
      jobId: string,
      objectKey: string,
      fitReport: Record<string, unknown> | null = null,
    ): Promise<void> {
      await client.send(
        new UpdateCommand({
          TableName: table,
          Key: { id: jobId },
          UpdateExpression:
            "SET #status = :status, objectKey = :objectKey, fitReport = :fitReport",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":status": "ready",
            ":objectKey": objectKey,
            ":fitReport": fitReport,
          },
        }),
      );
    },

    async markFailed(jobId: string, error: string): Promise<void> {
      await client.send(
        new UpdateCommand({
          TableName: table,
          Key: { id: jobId },
          UpdateExpression: "SET #status = :status, #error = :error",
          ExpressionAttributeNames: { "#status": "status", "#error": "error" },
          ExpressionAttributeValues: { ":status": "failed", ":error": error },
        }),
      );
    },
  };
}
