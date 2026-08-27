import { randomUUID } from "node:crypto";
import {
  type DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import type {
  McpApiKeyCreateInput,
  McpApiKeyCreateResult,
  McpApiKeyRecord,
  McpApiKeyStore,
  VerifiedMcpApiKey,
} from "@portfolio/shared/ports/mcp-api-key-store";
import { mcpApiKeyRowSchema } from "@portfolio/shared/schemas/mcp-api-key";
import {
  buildApiKeyToken,
  generateApiKeySecret,
  hashApiKey,
  parseApiKeyToken,
  runDummyHashCompare,
  secretsEqual,
} from "./mcp-api-key-crypto";

const MCP_KEY_PREFIX_DISPLAY_LEN = 16;

function toRecord(row: ReturnType<typeof mcpApiKeyRowSchema.parse>): McpApiKeyRecord {
  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    rateLimitMax: row.rate_limit_max,
    rateLimitWindowSec: row.rate_limit_window_sec,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

function rowToVerified(
  row: ReturnType<typeof mcpApiKeyRowSchema.parse>,
): VerifiedMcpApiKey {
  return {
    id: row.id,
    name: row.name,
    rateLimitMax: row.rate_limit_max,
    rateLimitWindowSec: row.rate_limit_window_sec,
    expiresAt: row.expires_at ? Math.floor(Date.parse(row.expires_at) / 1000) : null,
  };
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const ms = Date.parse(expiresAt);
  return Number.isFinite(ms) && ms <= Date.now();
}

export function createDynamoMcpApiKeyStore(
  client: DynamoDBDocumentClient,
  table: string,
): McpApiKeyStore {
  return {
    async listKeys() {
      const items: McpApiKeyRecord[] = [];
      let lastKey: Record<string, unknown> | undefined;
      do {
        const result = await client.send(
          new ScanCommand({
            TableName: table,
            ExclusiveStartKey: lastKey,
          }),
        );
        for (const item of result.Items ?? []) {
          items.push(toRecord(mcpApiKeyRowSchema.parse(item)));
        }
        lastKey = result.LastEvaluatedKey;
      } while (lastKey);
      return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async createKey(input: McpApiKeyCreateInput): Promise<McpApiKeyCreateResult> {
      const existing = await client.send(
        new QueryCommand({
          TableName: table,
          IndexName: "by-name",
          KeyConditionExpression: "#name = :name",
          ExpressionAttributeNames: { "#name": "name" },
          ExpressionAttributeValues: { ":name": input.name },
          Limit: 1,
        }),
      );
      if ((existing.Items?.length ?? 0) > 0) {
        throw new Error(`An API key named "${input.name}" already exists`);
      }

      const id = randomUUID().replace(/-/g, "").slice(0, 26);
      const secret = generateApiKeySecret();
      const key = buildApiKeyToken(id, secret);
      const row = mcpApiKeyRowSchema.parse({
        id,
        name: input.name,
        prefix: `${key.slice(0, MCP_KEY_PREFIX_DISPLAY_LEN)}…`,
        key_hash: hashApiKey(key),
        rate_limit_max: input.rateLimitMax,
        rate_limit_window_sec: input.rateLimitWindowSec,
        created_at: new Date().toISOString(),
        expires_at: input.expiresAt ?? null,
      });

      await client.send(
        new PutCommand({
          TableName: table,
          Item: row,
          ConditionExpression: "attribute_not_exists(id)",
        }),
      );

      return { key, record: toRecord(row) };
    },

    async deleteKey(id: string) {
      await client.send(
        new DeleteCommand({
          TableName: table,
          Key: { id },
        }),
      );
    },

    async verifyBearer(token: string): Promise<VerifiedMcpApiKey | null> {
      const parsed = parseApiKeyToken(token);
      if (!parsed) {
        runDummyHashCompare(token);
        return null;
      }

      const result = await client.send(
        new GetCommand({
          TableName: table,
          Key: { id: parsed.keyId },
        }),
      );

      if (!result.Item) {
        runDummyHashCompare(token);
        return null;
      }

      const row = mcpApiKeyRowSchema.parse(result.Item);
      if (!secretsEqual(hashApiKey(parsed.fullToken), row.key_hash)) {
        runDummyHashCompare(token);
        return null;
      }
      if (isExpired(row.expires_at)) {
        return null;
      }
      return rowToVerified(row);
    },
  };
}
