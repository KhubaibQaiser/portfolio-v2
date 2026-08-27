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

export function createMemoryMcpApiKeyStore(): McpApiKeyStore {
  const byId = new Map<string, ReturnType<typeof mcpApiKeyRowSchema.parse>>();
  const byName = new Map<string, string>();

  return {
    async listKeys() {
      return [...byId.values()]
        .map(toRecord)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async createKey(input: McpApiKeyCreateInput): Promise<McpApiKeyCreateResult> {
      if (byName.has(input.name)) {
        throw new Error(`An API key named "${input.name}" already exists`);
      }
      const id = crypto.randomUUID().replace(/-/g, "").slice(0, 26);
      const secret = generateApiKeySecret();
      const key = buildApiKeyToken(id, secret);
      const prefix = `${key.slice(0, MCP_KEY_PREFIX_DISPLAY_LEN)}…`;
      const row = mcpApiKeyRowSchema.parse({
        id,
        name: input.name,
        prefix,
        key_hash: hashApiKey(key),
        rate_limit_max: input.rateLimitMax,
        rate_limit_window_sec: input.rateLimitWindowSec,
        created_at: new Date().toISOString(),
        expires_at: input.expiresAt ?? null,
      });
      byId.set(id, row);
      byName.set(input.name, id);
      return { key, record: toRecord(row) };
    },

    async deleteKey(id: string) {
      const row = byId.get(id);
      if (row) {
        byName.delete(row.name);
        byId.delete(id);
      }
    },

    async verifyBearer(token: string): Promise<VerifiedMcpApiKey | null> {
      const parsed = parseApiKeyToken(token);
      if (!parsed) {
        runDummyHashCompare(token);
        return null;
      }
      const row = byId.get(parsed.keyId);
      if (!row) {
        runDummyHashCompare(token);
        return null;
      }
      if (!secretsEqual(hashApiKey(parsed.fullToken), row.key_hash)) {
        runDummyHashCompare(token);
        return null;
      }
      if (row.expires_at) {
        const expiresMs = Date.parse(row.expires_at);
        if (Number.isFinite(expiresMs) && expiresMs <= Date.now()) {
          return null;
        }
      }
      return {
        id: row.id,
        name: row.name,
        rateLimitMax: row.rate_limit_max,
        rateLimitWindowSec: row.rate_limit_window_sec,
        expiresAt: row.expires_at ? Math.floor(Date.parse(row.expires_at) / 1000) : null,
      };
    },
  };
}
