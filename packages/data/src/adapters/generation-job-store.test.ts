import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { describe, expect, it } from "vitest";
import type { GenerationJobInsert } from "@portfolio/shared/ports";
import { createDynamoGenerationJobStore } from "./dynamo-generation-job-store";
import { createMemoryGenerationJobStore } from "./memory-generation-job-store";

function job(overrides: Partial<GenerationJobInsert> = {}): GenerationJobInsert {
  return {
    jobId: "job-1",
    createdBy: "user-1",
    payload: { kind: "resume" },
    reservationId: "res-1",
    ...overrides,
  };
}

describe("createMemoryGenerationJobStore", () => {
  it("creates a job in queued status and reads it back", async () => {
    const store = createMemoryGenerationJobStore();
    const created = await store.create(job());
    expect(created).toMatchObject({
      status: "queued",
      generationId: null,
      result: null,
      error: null,
    });
    await expect(store.get("job-1")).resolves.toMatchObject({ status: "queued" });
  });

  it("returns null for an unknown job", async () => {
    const store = createMemoryGenerationJobStore();
    await expect(store.get("missing")).resolves.toBeNull();
  });

  it("transitions through running to ready", async () => {
    const store = createMemoryGenerationJobStore();
    await store.create(job());
    await store.markRunning("job-1");
    await expect(store.get("job-1")).resolves.toMatchObject({ status: "running" });
    await store.markReady("job-1", "gen-1", { generationId: "gen-1" });
    await expect(store.get("job-1")).resolves.toMatchObject({
      status: "ready",
      generationId: "gen-1",
      result: { generationId: "gen-1" },
    });
  });

  it("records a structured failure", async () => {
    const store = createMemoryGenerationJobStore();
    await store.create(job());
    await store.markFailed("job-1", {
      code: "GENERATION_TIMEOUT",
      message: "ran out of time",
      retryable: true,
    });
    await expect(store.get("job-1")).resolves.toMatchObject({
      status: "failed",
      error: { code: "GENERATION_TIMEOUT", retryable: true },
    });
  });

  it("no-ops status updates for a job that no longer exists", async () => {
    const store = createMemoryGenerationJobStore();
    await expect(store.markReady("missing", "g", {})).resolves.toBeUndefined();
    await expect(
      store.markFailed("missing", { code: "x", message: "y", retryable: false }),
    ).resolves.toBeUndefined();
  });
});

describe("createDynamoGenerationJobStore", () => {
  function mockClient(handler: (command: unknown) => unknown) {
    return {
      send: async (command: unknown) => handler(command),
    } as unknown as DynamoDBDocumentClient;
  }
  function commandName(command: unknown): string {
    return (command as { constructor: { name: string } }).constructor.name;
  }

  it("writes a queued job item keyed by jobId with a ttl", async () => {
    const sent: unknown[] = [];
    const client = mockClient((command) => {
      sent.push(command);
      return {};
    });
    const store = createDynamoGenerationJobStore(client, "portfolio-generation-job");

    const created = await store.create(job());
    expect(created).toMatchObject({ status: "queued", generationId: null, error: null });
    expect(sent).toHaveLength(1);
    expect(commandName(sent[0])).toBe("PutCommand");
    expect(sent[0]).toMatchObject({
      input: {
        TableName: "portfolio-generation-job",
        Item: expect.objectContaining({
          id: "job-1",
          status: "queued",
          ttl: expect.any(Number),
        }),
      },
    });
  });

  it("reads a job back and strips internal id/ttl fields", async () => {
    const client = mockClient((command) => {
      if (commandName(command) === "GetCommand") {
        return {
          Item: {
            id: "job-1",
            ttl: 999,
            jobId: "job-1",
            createdBy: "user-1",
            payload: { kind: "resume" },
            reservationId: "res-1",
            status: "ready",
            generationId: "gen-1",
            result: { generationId: "gen-1" },
            error: null,
            createdAt: 123,
          },
        };
      }
      return {};
    });
    const store = createDynamoGenerationJobStore(client, "portfolio-generation-job");

    const result = await store.get("job-1");
    expect(result).toEqual({
      jobId: "job-1",
      createdBy: "user-1",
      payload: { kind: "resume" },
      reservationId: "res-1",
      status: "ready",
      generationId: "gen-1",
      result: { generationId: "gen-1" },
      error: null,
      createdAt: 123,
    });
  });

  it("returns null when the job doesn't exist", async () => {
    const client = mockClient(() => ({}));
    const store = createDynamoGenerationJobStore(client, "portfolio-generation-job");
    await expect(store.get("missing")).resolves.toBeNull();
  });

  it("marks a job ready with an UpdateCommand", async () => {
    const sent: unknown[] = [];
    const client = mockClient((command) => {
      sent.push(command);
      return {};
    });
    const store = createDynamoGenerationJobStore(client, "portfolio-generation-job");

    await store.markReady("job-1", "gen-1", { generationId: "gen-1" });
    expect(commandName(sent[0])).toBe("UpdateCommand");
    expect(sent[0]).toMatchObject({
      input: {
        TableName: "portfolio-generation-job",
        Key: { id: "job-1" },
        ExpressionAttributeValues: {
          ":status": "ready",
          ":generationId": "gen-1",
          ":result": { generationId: "gen-1" },
        },
      },
    });
  });

  it("marks a job failed with the structured error", async () => {
    const sent: unknown[] = [];
    const client = mockClient((command) => {
      sent.push(command);
      return {};
    });
    const store = createDynamoGenerationJobStore(client, "portfolio-generation-job");

    await store.markFailed("job-1", {
      code: "FACT_VALIDATION_FAILED",
      message: "boom",
      retryable: true,
    });
    expect(sent[0]).toMatchObject({
      input: {
        ExpressionAttributeValues: {
          ":status": "failed",
          ":error": {
            code: "FACT_VALIDATION_FAILED",
            message: "boom",
            retryable: true,
          },
        },
      },
    });
  });
});
