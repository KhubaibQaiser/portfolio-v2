import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { describe, expect, it } from "vitest";
import type { RenderJobInsert } from "@portfolio/shared/ports";
import { createDynamoRenderJobStore } from "./dynamo-render-job-store";
import { createMemoryRenderJobStore } from "./memory-render-job-store";

function job(overrides: Partial<RenderJobInsert> = {}): RenderJobInsert {
  return {
    jobId: "job-1",
    createdBy: "user-1",
    generationId: "gen-1",
    kind: "resume",
    payload: { name: "Jane Doe" },
    filename: "Jane-Doe-Resume.pdf",
    ...overrides,
  };
}

describe("createMemoryRenderJobStore", () => {
  it("creates a job in queued status and reads it back", async () => {
    const store = createMemoryRenderJobStore();
    const created = await store.create(job());
    expect(created).toMatchObject({ status: "queued", objectKey: null, error: null });
    await expect(store.get("job-1")).resolves.toMatchObject({ status: "queued" });
  });

  it("returns null for an unknown job", async () => {
    const store = createMemoryRenderJobStore();
    await expect(store.get("missing")).resolves.toBeNull();
  });

  it("transitions through rendering to ready", async () => {
    const store = createMemoryRenderJobStore();
    await store.create(job());
    await store.markRendering("job-1");
    await expect(store.get("job-1")).resolves.toMatchObject({ status: "rendering" });
    await store.markReady("job-1", "render-jobs/job-1.pdf", { pageCount: 1 });
    await expect(store.get("job-1")).resolves.toMatchObject({
      status: "ready",
      objectKey: "render-jobs/job-1.pdf",
      fitReport: { pageCount: 1 },
    });
  });

  it("records a failure message", async () => {
    const store = createMemoryRenderJobStore();
    await store.create(job());
    await store.markFailed("job-1", "render worker crashed");
    await expect(store.get("job-1")).resolves.toMatchObject({
      status: "failed",
      error: "render worker crashed",
    });
  });

  it("no-ops status updates for a job that no longer exists", async () => {
    const store = createMemoryRenderJobStore();
    await expect(store.markReady("missing", "x.pdf")).resolves.toBeUndefined();
    await expect(store.markFailed("missing", "err")).resolves.toBeUndefined();
  });
});

describe("createDynamoRenderJobStore", () => {
  function mockClient(handler: (command: unknown) => unknown) {
    return {
      send: async (command: unknown) => handler(command),
    } as unknown as DynamoDBDocumentClient;
  }
  function commandName(command: unknown): string {
    return (command as { constructor: { name: string } }).constructor.name;
  }

  it("writes a queued job item keyed by jobId", async () => {
    const sent: unknown[] = [];
    const client = mockClient((command) => {
      sent.push(command);
      return {};
    });
    const store = createDynamoRenderJobStore(client, "portfolio-render-job");

    const created = await store.create(job());
    expect(created).toMatchObject({ status: "queued", objectKey: null, error: null });
    expect(sent).toHaveLength(1);
    expect(commandName(sent[0])).toBe("PutCommand");
    expect(sent[0]).toMatchObject({
      input: {
        TableName: "portfolio-render-job",
        Item: expect.objectContaining({ id: "job-1", status: "queued" }),
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
            generationId: "gen-1",
            kind: "resume",
            payload: {},
            filename: "x.pdf",
            status: "ready",
            objectKey: "render-jobs/job-1.pdf",
            error: null,
            fitReport: null,
            createdAt: 123,
          },
        };
      }
      return {};
    });
    const store = createDynamoRenderJobStore(client, "portfolio-render-job");

    const result = await store.get("job-1");
    expect(result).toEqual({
      jobId: "job-1",
      createdBy: "user-1",
      generationId: "gen-1",
      kind: "resume",
      payload: {},
      filename: "x.pdf",
      status: "ready",
      objectKey: "render-jobs/job-1.pdf",
      error: null,
      fitReport: null,
      createdAt: 123,
    });
  });

  it("returns null when the job doesn't exist", async () => {
    const client = mockClient(() => ({}));
    const store = createDynamoRenderJobStore(client, "portfolio-render-job");
    await expect(store.get("missing")).resolves.toBeNull();
  });

  it("marks a job ready with an UpdateCommand", async () => {
    const sent: unknown[] = [];
    const client = mockClient((command) => {
      sent.push(command);
      return {};
    });
    const store = createDynamoRenderJobStore(client, "portfolio-render-job");

    await store.markReady("job-1", "render-jobs/job-1.pdf", { pageCount: 1 });
    expect(commandName(sent[0])).toBe("UpdateCommand");
    expect(sent[0]).toMatchObject({
      input: {
        TableName: "portfolio-render-job",
        Key: { id: "job-1" },
        ExpressionAttributeValues: {
          ":status": "ready",
          ":objectKey": "render-jobs/job-1.pdf",
          ":fitReport": { pageCount: 1 },
        },
      },
    });
  });

  it("marks a job failed with the error message", async () => {
    const sent: unknown[] = [];
    const client = mockClient((command) => {
      sent.push(command);
      return {};
    });
    const store = createDynamoRenderJobStore(client, "portfolio-render-job");

    await store.markFailed("job-1", "boom");
    expect(sent[0]).toMatchObject({
      input: {
        ExpressionAttributeValues: { ":status": "failed", ":error": "boom" },
      },
    });
  });
});
