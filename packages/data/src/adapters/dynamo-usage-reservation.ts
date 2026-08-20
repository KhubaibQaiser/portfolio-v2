import { randomUUID } from "node:crypto";
import {
  DeleteCommand,
  type DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { UsageReservation, UsageReservationResult } from "@portfolio/shared/ports";

const WINDOW_SEC = 24 * 60 * 60;
const SETTLED_TTL_SEC = 3 * WINDOW_SEC;
/**
 * How long an unresolved hold counts toward the cap before it self-expires.
 * Comfortably above the slowest resume-generation worker budget
 * (WORKER_GENERATION_DEADLINE_MS in process-generation-job.ts) so a healthy
 * request never has its own hold vanish out from under it.
 */
const HOLD_TTL_SEC = 10 * 60;

function windowStart(nowSec: number): number {
  return Math.floor(nowSec / WINDOW_SEC) * WINDOW_SEC;
}

function partitionKey(userId: string): string {
  return `USAGE#ai#${userId}`;
}

function settledSortKey(windowStartSec: number): string {
  return `TOTAL#${windowStartSec}`;
}

function holdSortKey(windowStartSec: number, reservationId: string): string {
  return `HOLD#${windowStartSec}#${reservationId}`;
}

function roundUsd(value: number): number {
  return Math.max(0, Math.round(value * 1_000_000) / 1_000_000);
}

type WindowItem = {
  sk: string;
  spentUsd?: number;
  amountUsd?: number;
  ttl?: number;
};

/**
 * Short-TTL hold-based AI spend reservation backed by DynamoDB. Each
 * `reserve()` call queries the user's partition for the settled daily total
 * plus every currently-live hold, checks the sum against the cap, then
 * writes a new hold item with its own `HOLD_TTL_SEC` expiry.
 *
 * Note on concurrency: the check-then-write here is not a single atomic
 * DynamoDB operation (a true aggregate-vs-cap check across multiple items
 * would require a transactional counter plus a streams-driven decrement on
 * hold expiry — disproportionate complexity for a single-operator admin
 * cost cap). Two requests racing within the same instant could both observe
 * headroom and both reserve, temporarily slightly over-committing the cap;
 * that self-corrects within `HOLD_TTL_SEC` and is an acceptable trade-off
 * given this guards a small personal daily budget, not a multi-tenant
 * billing boundary. What this design does guarantee — and what the previous
 * single-counter implementation did not — is that a killed request can
 * never permanently exhaust the cap.
 */
export function createDynamoUsageReservation(
  client: DynamoDBDocumentClient,
  table: string,
): UsageReservation {
  return {
    async reserve(
      userId: string,
      estimatedUsd: number,
      capUsd: number,
    ): Promise<UsageReservationResult> {
      const nowSec = Math.floor(Date.now() / 1000);
      const windowStartSec = windowStart(nowSec);
      const roundedEstimate = roundUsd(estimatedUsd);
      const roundedCap = roundUsd(capUsd);

      const queried = await client.send(
        new QueryCommand({
          TableName: table,
          KeyConditionExpression: "pk = :pk",
          ExpressionAttributeValues: { ":pk": partitionKey(userId) },
        }),
      );
      const items = (queried.Items ?? []) as WindowItem[];

      let settledUsd = 0;
      let heldUsd = 0;
      const settledKey = settledSortKey(windowStartSec);
      const holdPrefix = `HOLD#${windowStartSec}#`;
      for (const item of items) {
        if (item.sk === settledKey) {
          settledUsd = item.spentUsd ?? 0;
        } else if (item.sk.startsWith(holdPrefix) && (item.ttl ?? 0) > nowSec) {
          heldUsd += item.amountUsd ?? 0;
        }
      }

      const projectedUsd = roundUsd(settledUsd + heldUsd + roundedEstimate);
      if (projectedUsd > roundedCap) {
        return {
          ok: false,
          spentUsd: roundUsd(settledUsd + heldUsd),
          capUsd: roundedCap,
          reason: "cost-cap",
        };
      }

      const reservationId = randomUUID();
      await client.send(
        new PutCommand({
          TableName: table,
          Item: {
            pk: partitionKey(userId),
            sk: holdSortKey(windowStartSec, reservationId),
            amountUsd: roundedEstimate,
            ttl: nowSec + HOLD_TTL_SEC,
          },
        }),
      );

      return { ok: true, spentUsd: projectedUsd, capUsd: roundedCap, reservationId };
    },

    async settle(userId: string, reservationId: string, actualUsd: number) {
      const nowSec = Math.floor(Date.now() / 1000);
      const windowStartSec = windowStart(nowSec);
      await Promise.all([
        client.send(
          new DeleteCommand({
            TableName: table,
            Key: {
              pk: partitionKey(userId),
              sk: holdSortKey(windowStartSec, reservationId),
            },
          }),
        ),
        client.send(
          new UpdateCommand({
            TableName: table,
            Key: { pk: partitionKey(userId), sk: settledSortKey(windowStartSec) },
            UpdateExpression: "ADD spentUsd :actual SET #ttl = :ttl",
            ExpressionAttributeNames: { "#ttl": "ttl" },
            ExpressionAttributeValues: {
              ":actual": roundUsd(actualUsd),
              ":ttl": windowStartSec + SETTLED_TTL_SEC,
            },
          }),
        ),
      ]);
    },

    async release(userId: string, reservationId: string) {
      const windowStartSec = windowStart(Math.floor(Date.now() / 1000));
      await client.send(
        new DeleteCommand({
          TableName: table,
          Key: {
            pk: partitionKey(userId),
            sk: holdSortKey(windowStartSec, reservationId),
          },
        }),
      );
    },
  };
}
