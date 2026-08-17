import { type DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { UsageReservation, UsageReservationResult } from "@portfolio/shared/ports";

const WINDOW_SEC = 24 * 60 * 60;
const TTL_SEC = 3 * WINDOW_SEC;

function windowKey(userId: string): { pk: string; sk: string; ttl: number } {
  const nowSec = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(nowSec / WINDOW_SEC) * WINDOW_SEC;
  return {
    pk: `USAGE#ai#${userId}`,
    sk: String(windowStart),
    ttl: windowStart + TTL_SEC,
  };
}

function roundUsd(value: number): number {
  return Math.max(0, Math.round(value * 1_000_000) / 1_000_000);
}

/**
 * Fixed-window AI spend reservation backed by one DynamoDB counter item per
 * user/day. `reserve()` increments conditionally in a single `UpdateCommand`,
 * which closes the read/check/write race that generation-history aggregation
 * cannot prevent. Store errors propagate so callers fail closed.
 */
export function createDynamoUsageReservation(
  client: DynamoDBDocumentClient,
  table: string,
): UsageReservation {
  async function adjust(
    userId: string,
    deltaUsd: number,
    capUsd?: number,
  ): Promise<number> {
    const key = windowKey(userId);
    const result = await client.send(
      new UpdateCommand({
        TableName: table,
        Key: { pk: key.pk, sk: key.sk },
        UpdateExpression: "ADD #spent :delta SET #ttl = :ttl",
        ...(capUsd !== undefined
          ? { ConditionExpression: "attribute_not_exists(#spent) OR #spent <= :cap" }
          : {}),
        ExpressionAttributeNames: { "#spent": "spentUsd", "#ttl": "ttl" },
        ExpressionAttributeValues: {
          ":delta": roundUsd(deltaUsd),
          ":ttl": key.ttl,
          ...(capUsd !== undefined ? { ":cap": roundUsd(capUsd) } : {}),
        },
        ReturnValues: "UPDATED_NEW",
      }),
    );
    return roundUsd(Number(result.Attributes?.spentUsd ?? 0));
  }

  return {
    async reserve(
      userId: string,
      estimatedUsd: number,
      capUsd: number,
    ): Promise<UsageReservationResult> {
      const roundedEstimate = roundUsd(estimatedUsd);
      const roundedCap = roundUsd(capUsd);
      try {
        const spentUsd = await adjust(
          userId,
          roundedEstimate,
          roundUsd(roundedCap - roundedEstimate),
        );
        return { ok: true, spentUsd, capUsd: roundedCap };
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "name" in error &&
          error.name === "ConditionalCheckFailedException"
        ) {
          return {
            ok: false,
            spentUsd: roundedCap,
            capUsd: roundedCap,
            reason: "cost-cap",
          };
        }
        throw error;
      }
    },

    async settle(userId: string, reservedUsd: number, actualUsd: number) {
      await adjust(userId, roundUsd(actualUsd) - roundUsd(reservedUsd));
    },

    async release(userId: string, reservedUsd: number) {
      await adjust(userId, -roundUsd(reservedUsd));
    },
  };
}
