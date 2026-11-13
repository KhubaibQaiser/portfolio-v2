import { describe, expect, it } from "vitest";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
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
