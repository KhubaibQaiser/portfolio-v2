/** Metadata returned by list/create — never includes the hash or plaintext key. */
export type McpApiKeyRecord = {
  id: string;
  name: string;
  prefix: string;
  rateLimitMax: number;
  rateLimitWindowSec: number;
  createdAt: string;
  expiresAt: string | null;
};

export type McpApiKeyCreateInput = {
  name: string;
  rateLimitMax: number;
  rateLimitWindowSec: number;
  expiresAt?: string | null;
};

export type McpApiKeyCreateResult = {
  /** Full bearer token — only returned once at creation. */
  key: string;
  record: McpApiKeyRecord;
};

/** Verified key context for MCP auth and per-key rate limits. */
export type VerifiedMcpApiKey = {
  id: string;
  name: string;
  rateLimitMax: number;
  rateLimitWindowSec: number;
  /** Unix seconds, if the key has an expiry. */
  expiresAt: number | null;
};

export type McpApiKeyStore = {
  listKeys(): Promise<McpApiKeyRecord[]>;
  createKey(input: McpApiKeyCreateInput): Promise<McpApiKeyCreateResult>;
  deleteKey(id: string): Promise<void>;
  verifyBearer(token: string): Promise<VerifiedMcpApiKey | null>;
};
