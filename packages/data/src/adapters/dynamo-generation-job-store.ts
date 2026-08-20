import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  type DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import type {
  GenerationJob,
  GenerationJobError,
  GenerationJobInsert,
  GenerationJobStore,
} from "@portfolio/shared/ports";

/** Jobs are request-scoped artifacts; 1 hour is comfortably above any
 * realistic poll duration (the worker itself has its own multi-minute
 * budget), so a forgotten job just disappears instead of accumulating. */
const TTL_SEC = 60 * 60;

type GenerationJobItem = GenerationJob & { id: string; ttl: number };

function fromItem(item: Record<string, unknown>): GenerationJob {
  const { id: _id, ttl: _ttl, ...job } = item as GenerationJobItem;
  return job;
}

/**
 * DynamoDB-backed {@link GenerationJobStore}. A single item per job, hash-keyed
 * by `id` (the job id), with a `ttl` attribute so stale jobs sweep themselves.
 */
export function createDynamoGenerationJobStore(
  client: DynamoDBDocumentClient,
  table: string,
): GenerationJobStore {
  return {
    async create(job: GenerationJobInsert): Promise<GenerationJob> {
      const record: GenerationJob = {
        ...job,
        status: "queued",
        generationId: null,
        result: null,
        error: null,
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

    async get(jobId: string): Promise<GenerationJob | null> {
      const result = await client.send(
        new GetCommand({ TableName: table, Key: { id: jobId } }),
      );
      return result.Item ? fromItem(result.Item) : null;
    },

    async markRunning(jobId: string): Promise<void> {
      await client.send(
        new UpdateCommand({
          TableName: table,
          Key: { id: jobId },
          UpdateExpression: "SET #status = :status",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: { ":status": "running" },
        }),
      );
    },

    async markReady(
      jobId: string,
      generationId: string,
      result: Record<string, unknown>,
    ): Promise<void> {
      await client.send(
        new UpdateCommand({
          TableName: table,
          Key: { id: jobId },
          UpdateExpression:
            "SET #status = :status, generationId = :generationId, #result = :result",
          ExpressionAttributeNames: { "#status": "status", "#result": "result" },
          ExpressionAttributeValues: {
            ":status": "ready",
            ":generationId": generationId,
            ":result": result,
          },
        }),
      );
    },

    async markFailed(jobId: string, error: GenerationJobError): Promise<void> {
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
