/**
 * Backend-agnostic cache for portfolio chat assistant replies.
 * Production: DynamoDB + TTL. Local/fixture: in-memory Map.
 *
 * Store errors must not be swallowed by adapters — callers decide fail-open.
 */
export type ChatResponseCacheEntry = {
  /** Full assistant markdown/text to replay to the client. */
  text: string;
  /** Unix seconds when the entry expires (Dynamo TTL attribute). */
  expiresAtSec: number;
};

export type ChatResponseCache = {
  get(key: string): Promise<ChatResponseCacheEntry | null>;
  set(key: string, text: string, ttlSec: number): Promise<void>;
};
