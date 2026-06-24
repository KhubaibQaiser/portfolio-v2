import type { ContentRepository } from "@portfolio/shared/ports";
import { createFixtureContentRepository } from "./adapters/fixture-content-repository";

export { createFixtureContentRepository } from "./adapters/fixture-content-repository";

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
      throw new Error(
        "DynamoDB content repository is not wired yet. Set DATA_BACKEND=fixture for local development.",
      );
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
