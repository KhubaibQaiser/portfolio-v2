import type {
  ChatResponseCache,
  ContentRepository,
  CostCap,
  RateLimiter,
} from "@portfolio/shared/ports";
import { createFixtureContentRepository } from "./adapters/fixture-content-repository";
import { createMultiTableContentRepository } from "./adapters/multi-table-content-repository";
import { createDynamoRateLimiter } from "./adapters/dynamo-rate-limiter";
import { createNoopRateLimiter } from "./adapters/noop-rate-limiter";
import { createDynamoChatResponseCache } from "./adapters/dynamo-chat-response-cache";
import { createMemoryChatResponseCache } from "./adapters/memory-chat-response-cache";
import { createContentCostCap } from "./adapters/content-cost-cap";
import { createDynamoClient } from "./dynamo/client";
import { buildTableNames } from "./dynamo/tables";

export { createFixtureContentRepository } from "./adapters/fixture-content-repository";
export { createMultiTableContentRepository } from "./adapters/multi-table-content-repository";
export { createDynamoRateLimiter } from "./adapters/dynamo-rate-limiter";
export { createNoopRateLimiter } from "./adapters/noop-rate-limiter";
export { createDynamoChatResponseCache } from "./adapters/dynamo-chat-response-cache";
export { createMemoryChatResponseCache } from "./adapters/memory-chat-response-cache";
export { createContentCostCap } from "./adapters/content-cost-cap";
export { createDynamoClient } from "./dynamo/client";
export {
  buildTableNames,
  resolveTablePrefix,
  buildCreateTableInputs,
  TABLE_SUFFIXES,
  type TableNames,
  type TableKey,
} from "./dynamo/tables";
export { ensureTables } from "./dynamo/create-table";

// Media/S3 helpers live in `@portfolio/data/media` so content-only pages don't
// bundle the AWS S3 SDK. See ./media.ts.

export type DataBackend = "fixture" | "dynamo";

/** Reads the active data backend from the environment (defaults to fixture). */
export function resolveDataBackend(): DataBackend {
  return process.env.DATA_BACKEND?.toLowerCase() === "dynamo" ? "dynamo" : "fixture";
}

function createContentRepository(): ContentRepository {
  const backend = resolveDataBackend();
  switch (backend) {
    case "fixture":
      return createFixtureContentRepository();
    case "dynamo":
      return createMultiTableContentRepository(createDynamoClient(), buildTableNames());
  }
}

let cached: ContentRepository | undefined;

/**
 * Returns the process-wide content repository for the active backend. The
 * instance is memoized so the fixture backend keeps admin edits in memory for
 * the lifetime of the dev server.
 */
export function getContentRepository(): ContentRepository {
  cached ??= createContentRepository();
  return cached;
}

/**
 * Returns the rate limiter for the active backend: DynamoDB when `dynamo` is
 * selected, otherwise a no-op limiter for local dev.
 */
export function getRateLimiter(): RateLimiter {
  return resolveDataBackend() === "dynamo"
    ? createDynamoRateLimiter(createDynamoClient(), buildTableNames().rateLimit)
    : createNoopRateLimiter();
}

let cachedChatResponseCache: ChatResponseCache | undefined;

/**
 * Returns the chat response cache: DynamoDB + TTL in production, in-memory Map
 * for fixture/local so exact-match caching still works in dev.
 */
export function getChatResponseCache(): ChatResponseCache {
  if (!cachedChatResponseCache) {
    cachedChatResponseCache =
      resolveDataBackend() === "dynamo"
        ? createDynamoChatResponseCache(
            createDynamoClient(),
            buildTableNames().chatCache,
          )
        : createMemoryChatResponseCache();
  }
  return cachedChatResponseCache;
}

/** Returns the cost cap bound to the active content repository. */
export function getCostCap(): CostCap {
  return createContentCostCap(getContentRepository());
}
