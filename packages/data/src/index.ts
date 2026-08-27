import { SQSClient } from "@aws-sdk/client-sqs";
import type {
  ChatResponseCache,
  ContentRepository,
  CostCap,
  GenerationJobQueue,
  GenerationJobStore,
  McpApiKeyStore,
  RateLimiter,
  RenderJobQueue,
  RenderJobStore,
  UsageReservation,
} from "@portfolio/shared/ports";
import { createFixtureContentRepository } from "./adapters/fixture-content-repository";
import { createMultiTableContentRepository } from "./adapters/multi-table-content-repository";
import { createDynamoRateLimiter } from "./adapters/dynamo-rate-limiter";
import { createNoopRateLimiter } from "./adapters/noop-rate-limiter";
import { createDynamoUsageReservation } from "./adapters/dynamo-usage-reservation";
import { createMemoryUsageReservation } from "./adapters/memory-usage-reservation";
import { createDynamoChatResponseCache } from "./adapters/dynamo-chat-response-cache";
import { createMemoryChatResponseCache } from "./adapters/memory-chat-response-cache";
import { createDynamoRenderJobStore } from "./adapters/dynamo-render-job-store";
import { createMemoryRenderJobStore } from "./adapters/memory-render-job-store";
import { createSqsRenderJobQueue } from "./adapters/sqs-render-job-queue";
import { createDynamoGenerationJobStore } from "./adapters/dynamo-generation-job-store";
import { createMemoryGenerationJobStore } from "./adapters/memory-generation-job-store";
import { createSqsGenerationJobQueue } from "./adapters/sqs-generation-job-queue";
import { createDynamoMcpApiKeyStore } from "./adapters/dynamo-mcp-api-key-store";
import { createMemoryMcpApiKeyStore } from "./adapters/memory-mcp-api-key-store";
import { createContentCostCap } from "./adapters/content-cost-cap";
import { createDynamoClient } from "./dynamo/client";
import { buildTableNames } from "./dynamo/tables";

export { createFixtureContentRepository } from "./adapters/fixture-content-repository";
export { createMultiTableContentRepository } from "./adapters/multi-table-content-repository";
export { createDynamoRateLimiter } from "./adapters/dynamo-rate-limiter";
export { createNoopRateLimiter } from "./adapters/noop-rate-limiter";
export { createDynamoUsageReservation } from "./adapters/dynamo-usage-reservation";
export { createMemoryUsageReservation } from "./adapters/memory-usage-reservation";
export { createDynamoChatResponseCache } from "./adapters/dynamo-chat-response-cache";
export { createMemoryChatResponseCache } from "./adapters/memory-chat-response-cache";
export { createDynamoRenderJobStore } from "./adapters/dynamo-render-job-store";
export { createMemoryRenderJobStore } from "./adapters/memory-render-job-store";
export { createSqsRenderJobQueue } from "./adapters/sqs-render-job-queue";
export { createDynamoGenerationJobStore } from "./adapters/dynamo-generation-job-store";
export { createMemoryGenerationJobStore } from "./adapters/memory-generation-job-store";
export { createSqsGenerationJobQueue } from "./adapters/sqs-generation-job-queue";
export { createDynamoMcpApiKeyStore } from "./adapters/dynamo-mcp-api-key-store";
export { createMemoryMcpApiKeyStore } from "./adapters/memory-mcp-api-key-store";
export {
  hashApiKey,
  parseApiKeyToken,
  buildApiKeyToken,
  runDummyHashCompare,
  secretsEqual,
} from "./adapters/mcp-api-key-crypto";
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
        ? createDynamoChatResponseCache(createDynamoClient(), buildTableNames().chatCache)
        : createMemoryChatResponseCache();
  }
  return cachedChatResponseCache;
}

/** Returns the cost cap bound to the active content repository. */
export function getCostCap(): CostCap {
  return createContentCostCap(getContentRepository());
}

let cachedRenderJobStore: RenderJobStore | undefined;

/**
 * Returns the render-job store: DynamoDB in production, in-memory for
 * fixture/local so the admin async-download flow works the same way in dev.
 */
export function getRenderJobStore(): RenderJobStore {
  if (!cachedRenderJobStore) {
    cachedRenderJobStore =
      resolveDataBackend() === "dynamo"
        ? createDynamoRenderJobStore(createDynamoClient(), buildTableNames().renderJob)
        : createMemoryRenderJobStore();
  }
  return cachedRenderJobStore;
}

let cachedRenderJobQueue: RenderJobQueue | null | undefined;

/**
 * Returns the render-job queue when `RENDER_JOB_QUEUE_URL` is configured
 * (deployed environments), or `null` when it isn't (fixture/local dev, where
 * there's no worker Lambda to consume it — callers fall back to processing
 * jobs inline in that case).
 */
export function getRenderJobQueue(): RenderJobQueue | null {
  if (cachedRenderJobQueue === undefined) {
    const queueUrl = process.env.RENDER_JOB_QUEUE_URL;
    cachedRenderJobQueue = queueUrl
      ? createSqsRenderJobQueue({
          client: new SQSClient({ region: process.env.AWS_REGION ?? "eu-west-1" }),
          queueUrl,
        })
      : null;
  }
  return cachedRenderJobQueue;
}

let cachedGenerationJobStore: GenerationJobStore | undefined;

/**
 * Returns the generation-job store: DynamoDB in production, in-memory for
 * fixture/local so the admin async-generate flow works the same way in dev.
 */
export function getGenerationJobStore(): GenerationJobStore {
  if (!cachedGenerationJobStore) {
    cachedGenerationJobStore =
      resolveDataBackend() === "dynamo"
        ? createDynamoGenerationJobStore(
            createDynamoClient(),
            buildTableNames().generationJob,
          )
        : createMemoryGenerationJobStore();
  }
  return cachedGenerationJobStore;
}

let cachedGenerationJobQueue: GenerationJobQueue | null | undefined;

/**
 * Returns the generation-job queue when `GENERATION_JOB_QUEUE_URL` is
 * configured (deployed environments), or `null` when it isn't (fixture/local
 * dev, where there's no worker Lambda to consume it — callers fall back to
 * processing jobs inline in that case).
 */
export function getGenerationJobQueue(): GenerationJobQueue | null {
  if (cachedGenerationJobQueue === undefined) {
    const queueUrl = process.env.GENERATION_JOB_QUEUE_URL;
    cachedGenerationJobQueue = queueUrl
      ? createSqsGenerationJobQueue({
          client: new SQSClient({ region: process.env.AWS_REGION ?? "eu-west-1" }),
          queueUrl,
        })
      : null;
  }
  return cachedGenerationJobQueue;
}

let cachedUsageReservation: UsageReservation | undefined;

/**
 * Returns the atomic usage reservation adapter: DynamoDB in production,
 * in-memory for fixture/local so tests exercise the same port semantics.
 */
export function getUsageReservation(): UsageReservation {
  if (!cachedUsageReservation) {
    cachedUsageReservation =
      resolveDataBackend() === "dynamo"
        ? createDynamoUsageReservation(createDynamoClient(), buildTableNames().rateLimit)
        : createMemoryUsageReservation();
  }
  return cachedUsageReservation;
}

let cachedMcpApiKeyStore: McpApiKeyStore | undefined;

/** Returns the MCP API key store for admin minting and candidate-mcp verification. */
export function getMcpApiKeyStore(): McpApiKeyStore {
  if (!cachedMcpApiKeyStore) {
    cachedMcpApiKeyStore =
      resolveDataBackend() === "dynamo"
        ? createDynamoMcpApiKeyStore(createDynamoClient(), buildTableNames().mcpApiKey)
        : createMemoryMcpApiKeyStore();
  }
  return cachedMcpApiKeyStore;
}
