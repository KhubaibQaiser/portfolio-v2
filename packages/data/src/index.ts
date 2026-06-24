import type { ContentRepository, CostCap, RateLimiter } from "@portfolio/shared/ports";
import { createFixtureContentRepository } from "./adapters/fixture-content-repository";
import { createDynamoContentRepository } from "./adapters/dynamo-content-repository";
import { createDynamoRateLimiter } from "./adapters/dynamo-rate-limiter";
import { createNoopRateLimiter } from "./adapters/noop-rate-limiter";
import { createContentCostCap } from "./adapters/content-cost-cap";
import { createDynamoClient } from "./dynamo/client";
import { resolveTableName } from "./dynamo/table";

export { createFixtureContentRepository } from "./adapters/fixture-content-repository";
export { createDynamoContentRepository } from "./adapters/dynamo-content-repository";
export { createDynamoRateLimiter } from "./adapters/dynamo-rate-limiter";
export { createNoopRateLimiter } from "./adapters/noop-rate-limiter";
export { createContentCostCap } from "./adapters/content-cost-cap";
export { createDynamoClient } from "./dynamo/client";
export { resolveTableName, buildCreateTableInput } from "./dynamo/table";
export { ensureTable } from "./dynamo/create-table";

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
      return createDynamoContentRepository(createDynamoClient(), resolveTableName());
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
    ? createDynamoRateLimiter(createDynamoClient(), resolveTableName())
    : createNoopRateLimiter();
}

/** Returns the cost cap bound to the active content repository. */
export function getCostCap(): CostCap {
  return createContentCostCap(getContentRepository());
}
