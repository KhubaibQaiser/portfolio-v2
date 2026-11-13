import { describe, expect, it } from "vitest";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { GetCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ContentConflictError } from "@portfolio/shared/concurrency";
import { createMultiTableContentRepository } from "./multi-table-content-repository";
import { buildTableNames } from "../dynamo/tables";
import { projectFixtures } from "../fixtures/content";

const { id: _i, created_at: _c, updated_at: _u, ...form } = projectFixtures[0]!;

function fakeClient(send: (cmd: unknown) => Promise<unknown>) {
  return { send } as unknown as DynamoDBDocumentClient;
}

describe("insertProject (no DynamoDB needed)", () => {
  it("with an explicit id sends a conditional put and keeps that id", async () => {
    const sent: PutCommand[] = [];
    const repo = createMultiTableContentRepository(
      fakeClient(async (cmd) => {
        sent.push(cmd as PutCommand);
        return {};
      }),
      buildTableNames("t"),
    );

    const row = await repo.insertProject(form, { id: "slug-x" });

    expect(row.id).toBe("slug-x");
    expect(sent).toHaveLength(1);
    expect(sent[0]!.input.Item?.id).toBe("slug-x");
    expect(sent[0]!.input.ConditionExpression).toBe("attribute_not_exists(#pk)");
    expect(sent[0]!.input.ExpressionAttributeNames).toEqual({ "#pk": "id" });
  });

  it("maps a failed condition to ContentConflictError", async () => {
    const repo = createMultiTableContentRepository(
      fakeClient(async () => {
        throw new ConditionalCheckFailedException({
          message: "exists",
          $metadata: {},
        });
      }),
      buildTableNames("t"),
    );

    await expect(repo.insertProject(form, { id: "slug-x" })).rejects.toBeInstanceOf(
      ContentConflictError,
    );
  });

  it("without an id stays an unconditional put with a random id", async () => {
    const sent: PutCommand[] = [];
    const repo = createMultiTableContentRepository(
      fakeClient(async (cmd) => {
        sent.push(cmd as PutCommand);
        return {};
      }),
      buildTableNames("t"),
    );

    const row = await repo.insertProject(form);

    expect(row.id).not.toMatch(/^slug-/);
    expect(sent[0]!.input.ConditionExpression).toBeUndefined();
  });
});

describe("pending project revisions (no DynamoDB needed)", () => {
  const pending = {
    values: { title: "Edited" },
    base_revision: 1,
    proposed_at: "2026-11-13T00:00:00.000Z",
    proposed_by: "client-1",
  };
  const stored = {
    ...form,
    id: "p1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    revision: 1,
    status: "published",
    pending_revision: pending,
  };

  it("stages a revision with a revision-guarded put and keeps live fields", async () => {
    const puts: PutCommand[] = [];
    const repo = createMultiTableContentRepository(
      fakeClient(async (cmd) => {
        if (cmd instanceof GetCommand)
          return { Item: { ...stored, pending_revision: undefined } };
        puts.push(cmd as PutCommand);
        return {};
      }),
      buildTableNames("t"),
    );

    await repo.updateProject("p1", { pending_revision: pending }, 1);

    const item = puts[0]!.input.Item!;
    expect(item.title).toBe(form.title);
    expect(item.pending_revision).toEqual(pending);
    expect(item.revision).toBe(2);
    expect(puts[0]!.input.ConditionExpression).toContain("#revision = :expectedRevision");
  });

  it("removes the attribute when pending_revision is null", async () => {
    const puts: PutCommand[] = [];
    const repo = createMultiTableContentRepository(
      fakeClient(async (cmd) => {
        if (cmd instanceof GetCommand) return { Item: stored };
        puts.push(cmd as PutCommand);
        return {};
      }),
      buildTableNames("t"),
    );

    await repo.updateProject("p1", { title: "Edited", pending_revision: null }, 1);

    expect(puts[0]!.input.Item).not.toHaveProperty("pending_revision");
    expect(puts[0]!.input.Item!.title).toBe("Edited");
  });

  it("never returns pending_revision from public reads, but does for Admin reads", async () => {
    const repo = createMultiTableContentRepository(
      fakeClient(async (cmd) => {
        if (cmd instanceof ScanCommand) return { Items: [stored] };
        if (cmd instanceof GetCommand) return { Item: stored };
        return { Items: [stored] };
      }),
      buildTableNames("t"),
    );

    const publicRows = [
      ...(await repo.getProjects()),
      ...(await repo.getFeaturedProjects()),
      (await repo.getProjectBySlug(form.slug))!,
    ];
    expect(publicRows.length).toBeGreaterThan(0);
    for (const row of publicRows) expect(row).not.toHaveProperty("pending_revision");

    expect((await repo.getAllProjects())[0]!.pending_revision).toEqual(pending);
    expect((await repo.getProjectById("p1")).pending_revision).toEqual(pending);
  });
});
