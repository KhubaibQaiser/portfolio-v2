import { type DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type {
  RateLimiter,
  RateLimitOptions,
  RateLimitResult,
} from "@portfolio/shared/ports";

/**
 * Fixed-window rate limiter backed by a single DynamoDB item per
 * identifier+window. Each request atomically increments a counter (`ADD`) and
 * stamps a `ttl` so DynamoDB auto-expires stale windows.
 *
 * Store errors are not swallowed — they propagate so the caller can log them
 * and apply an explicit policy (e.g. fail-open for availability) with full
 * visibility, rather than silently stopping rate limiting here.
 *
 * The table must have TTL enabled on the `ttl` attribute (configured by the
 * infra stack in production; a no-op locally where TTL sweeps are not run).
 */
export function createDynamoRateLimiter(
  client: DynamoDBDocumentClient,
  table: string,
): RateLimiter {
  return {
    async check(identifier: string, options: RateLimitOptions): Promise<RateLimitResult> {
      const { max, windowSec } = options;
      const prefix = options.prefix ?? "default";
      const nowSec = Math.floor(Date.now() / 1000);
      const windowStart = Math.floor(nowSec / windowSec) * windowSec;
      const windowEnd = windowStart + windowSec;

      const result = await client.send(
        new UpdateCommand({
          TableName: table,
          Key: {
            pk: `RATELIMIT#${prefix}#${identifier}`,
            sk: String(windowStart),
          },
          UpdateExpression: "ADD #count :one SET #ttl = :ttl",
          ExpressionAttributeNames: { "#count": "count", "#ttl": "ttl" },
          ExpressionAttributeValues: {
            ":one": 1,
            ":ttl": windowEnd + windowSec,
          },
          ReturnValues: "UPDATED_NEW",
        }),
      );

      const count = Number(result.Attributes?.count ?? 0);
      if (count > max) {
        return {
          ok: false,
          retryAfterSeconds: Math.max(1, windowEnd - nowSec),
          limit: max,
          remaining: 0,
        };
      }
      return { ok: true };
    },
  };
}
