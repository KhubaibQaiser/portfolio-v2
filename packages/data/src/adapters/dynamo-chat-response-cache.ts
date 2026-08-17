import {
  type DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import type { ChatResponseCache, ChatResponseCacheEntry } from "@portfolio/shared/ports";

/**
 * Chat response cache backed by DynamoDB with TTL auto-expiry.
 * Item shape: { pk, text, ttl } where ttl is Unix seconds.
 */
export function createDynamoChatResponseCache(
  client: DynamoDBDocumentClient,
  table: string,
): ChatResponseCache {
  return {
    async get(key: string): Promise<ChatResponseCacheEntry | null> {
      const result = await client.send(
        new GetCommand({
          TableName: table,
          Key: { pk: key },
          ConsistentRead: false,
        }),
      );

      const item = result.Item;
      if (!item || typeof item.text !== "string" || item.text.length === 0) {
        return null;
      }

      const expiresAtSec =
        typeof item.ttl === "number"
          ? item.ttl
          : Number.parseInt(String(item.ttl ?? "0"), 10);

      if (!Number.isFinite(expiresAtSec) || expiresAtSec <= 0) {
        return null;
      }

      // Dynamo TTL deletion is eventual — reject expired rows ourselves.
      if (expiresAtSec <= Math.floor(Date.now() / 1000)) {
        return null;
      }

      return { text: item.text, expiresAtSec };
    },

    async set(key: string, text: string, ttlSec: number): Promise<void> {
      const nowSec = Math.floor(Date.now() / 1000);
      const expiresAtSec = nowSec + Math.max(1, Math.floor(ttlSec));

      await client.send(
        new PutCommand({
          TableName: table,
          Item: {
            pk: key,
            text,
            ttl: expiresAtSec,
          },
        }),
      );
    },
  };
}
