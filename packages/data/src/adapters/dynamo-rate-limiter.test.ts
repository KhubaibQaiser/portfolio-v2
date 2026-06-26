import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { beforeAll, describe, expect, it } from "vitest";
import type { RateLimiter } from "@portfolio/shared/ports";
import { createDynamoRateLimiter } from "./dynamo-rate-limiter";
import { ensureTables } from "../dynamo/create-table";
import { buildTableNames } from "../dynamo/tables";

// Integration suite — requires DynamoDB Local. Skipped unless the endpoint is
// set. Run with:
//   docker compose -f docker-compose.dev.yml up -d
//   DYNAMODB_LOCAL_ENDPOINT=http://localhost:8000 pnpm test
const endpoint = process.env.DYNAMODB_LOCAL_ENDPOINT;

describe.skipIf(!endpoint)("createDynamoRateLimiter (integration)", () => {
  let limiter: RateLimiter;

  beforeAll(async () => {
    const names = buildTableNames(`portfolio-rl-${Date.now()}`);
    const base = new DynamoDBClient({
      endpoint,
      region: "us-east-1",
      credentials: { accessKeyId: "local", secretAccessKey: "local" },
    });
    await ensureTables(base, names);
    const doc = DynamoDBDocumentClient.from(base);
    limiter = createDynamoRateLimiter(doc, names.rateLimit);
  });

  it("allows up to max requests, then denies within the window", async () => {
    const id = `ip:${Date.now()}`;
    const opts = { max: 2, windowSec: 60, prefix: "test" };

    expect(await limiter.check(id, opts)).toEqual({ ok: true });
    expect(await limiter.check(id, opts)).toEqual({ ok: true });

    const denied = await limiter.check(id, opts);
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.limit).toBe(2);
      expect(denied.remaining).toBe(0);
      expect(denied.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("tracks identifiers independently", async () => {
    const opts = { max: 1, windowSec: 60, prefix: "test" };
    expect(await limiter.check(`a:${Date.now()}`, opts)).toEqual({ ok: true });
    expect(await limiter.check(`b:${Date.now()}`, opts)).toEqual({ ok: true });
  });
});
