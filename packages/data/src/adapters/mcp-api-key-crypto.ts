import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { MCP_API_KEY_PREFIX } from "@portfolio/shared/schemas/mcp-api-key";

/** Fixed-length key id embedded in `mcp_ck_<keyId>_<secret>` (matches createKey generators). */
export const MCP_API_KEY_ID_LEN = 26;

/** 32 random bytes, base64url without padding. */
export function generateApiKeySecret(): string {
  return randomBytes(32).toString("base64url");
}

export function hashApiKey(fullToken: string): string {
  return createHash("sha256").update(fullToken, "utf8").digest("hex");
}

export type ParsedApiKeyToken = {
  keyId: string;
  fullToken: string;
  displayPrefix: string;
};

/**
 * Parses `mcp_ck_<keyId>_<secret>`. Returns null when the format is invalid.
 * `keyId` is a fixed-width id; the secret is base64url and may contain `_`.
 */
export function parseApiKeyToken(token: string): ParsedApiKeyToken | null {
  if (!token.startsWith(MCP_API_KEY_PREFIX)) return null;
  const rest = token.slice(MCP_API_KEY_PREFIX.length);
  if (rest.length <= MCP_API_KEY_ID_LEN + 1) return null;
  if (rest[MCP_API_KEY_ID_LEN] !== "_") return null;
  const keyId = rest.slice(0, MCP_API_KEY_ID_LEN);
  const secret = rest.slice(MCP_API_KEY_ID_LEN + 1);
  if (!keyId || !secret) return null;
  return {
    keyId,
    fullToken: token,
    displayPrefix: `${MCP_API_KEY_PREFIX}${keyId.slice(0, 8)}…`,
  };
}

export function buildApiKeyToken(keyId: string, secret: string): string {
  return `${MCP_API_KEY_PREFIX}${keyId}_${secret}`;
}

/** Constant-time compare of hex SHA-256 digests. */
export function secretsEqual(providedHash: string, expectedHash: string): boolean {
  try {
    const a = Buffer.from(providedHash, "hex");
    const b = Buffer.from(expectedHash, "hex");
    if (a.length !== b.length) {
      timingSafeEqual(a, a);
      return false;
    }
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Dummy hash compare so invalid tokens take similar time to valid lookups. */
export function runDummyHashCompare(token: string): void {
  const dummy = hashApiKey(token.padEnd(64, "0"));
  secretsEqual(dummy, hashApiKey("dummy-compare-value"));
}
