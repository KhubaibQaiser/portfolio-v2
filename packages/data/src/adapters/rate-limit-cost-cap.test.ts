import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { describe, expect, it } from "vitest";
import type { ContentRepository } from "@portfolio/shared/ports";
import type { ResumeGenerationInsert } from "@portfolio/shared/types";
import { createFixtureContentRepository } from "./fixture-content-repository";
import { createContentCostCap } from "./content-cost-cap";
import { createDynamoRateLimiter } from "./dynamo-rate-limiter";
import { createNoopRateLimiter } from "./noop-rate-limiter";
import { createDynamoUsageReservation } from "./dynamo-usage-reservation";
import { createMemoryUsageReservation } from "./memory-usage-reservation";

function generation(createdBy: string, costUsd: number): ResumeGenerationInsert {
  return {
    created_by: createdBy,
    company: null,
    role: null,
    hiring_manager: null,
    language: "en",
    tone: null,
    length: null,
    jd_text: "JD",
    jd_source: "paste",
    jd_pdf_url: null,
    model: "test-model",
    fallback_used: false,
    resume: null,
    cover_letter: null,
    ats: null,
    usage: { costUsd },
    resume_pdf_url: null,
    cover_letter_pdf_url: null,
    layout_id: null,
    applied_changes: [],
    archived_at: null,
    deleted_at: null,
  };
}

describe("createContentCostCap", () => {
  it("allows when spend is under the cap", async () => {
    const repo = createFixtureContentRepository();
    await repo.insertResumeGeneration(generation("user-1", 0.5));
    const cap = createContentCostCap(repo);

    expect(await cap.check("user-1", 2)).toEqual({
      ok: true,
      spentUsd: 0.5,
      capUsd: 2,
    });
  });

  it("denies when spend reaches the cap", async () => {
    const repo = createFixtureContentRepository();
    await repo.insertResumeGeneration(generation("user-1", 1.5));
    await repo.insertResumeGeneration(generation("user-1", 0.6));
    const cap = createContentCostCap(repo);

    expect(await cap.check("user-1", 2)).toEqual({
      ok: false,
      spentUsd: 2.1,
      capUsd: 2,
      reason: "cost-cap",
    });
  });

  it("scopes spend per user", async () => {
    const repo = createFixtureContentRepository();
    await repo.insertResumeGeneration(generation("user-1", 5));
    const cap = createContentCostCap(repo);

    expect(await cap.check("user-2", 2)).toEqual({
      ok: true,
      spentUsd: 0,
      capUsd: 2,
    });
  });

  it("propagates errors instead of silently allowing", async () => {
    const repo = {
      sumDailyUsage: async () => {
        throw new Error("usage store unavailable");
      },
    } as unknown as ContentRepository;
    const cap = createContentCostCap(repo);

    await expect(cap.check("user-1", 2)).rejects.toThrow("usage store unavailable");
  });
});

describe("createNoopRateLimiter", () => {
  it("always allows", async () => {
    const limiter = createNoopRateLimiter();
    expect(await limiter.check("ip:1.2.3.4", { max: 1, windowSec: 60 })).toEqual({
      ok: true,
    });
    expect(await limiter.check("ip:1.2.3.4", { max: 1, windowSec: 60 })).toEqual({
      ok: true,
    });
  });
});

describe("createDynamoRateLimiter", () => {
  it("propagates store errors instead of silently allowing", async () => {
    const client = {
      send: async () => {
        throw new Error("dynamo unavailable");
      },
    } as unknown as DynamoDBDocumentClient;
    const limiter = createDynamoRateLimiter(client, "portfolio");

    await expect(limiter.check("ip:1.2.3.4", { max: 1, windowSec: 60 })).rejects.toThrow(
      "dynamo unavailable",
    );
  });
});

describe("createMemoryUsageReservation", () => {
  it("reserves, settles, and releases spend per user", async () => {
    const reservation = createMemoryUsageReservation();

    expect(await reservation.reserve("user-1", 0.5, 1)).toEqual({
      ok: true,
      spentUsd: 0.5,
      capUsd: 1,
    });
    await reservation.settle("user-1", 0.5, 0.25);
    expect(await reservation.reserve("user-1", 0.75, 1)).toEqual({
      ok: true,
      spentUsd: 1,
      capUsd: 1,
    });
    await reservation.release("user-1", 0.75);
    expect(await reservation.reserve("user-1", 0.25, 1)).toEqual({
      ok: true,
      spentUsd: 0.5,
      capUsd: 1,
    });
  });

  it("rejects reservations that would exceed the cap", async () => {
    const reservation = createMemoryUsageReservation();
    await reservation.reserve("user-1", 0.8, 1);

    expect(await reservation.reserve("user-1", 0.3, 1)).toEqual({
      ok: false,
      spentUsd: 1.1,
      capUsd: 1,
      reason: "cost-cap",
    });
    expect(await reservation.reserve("user-2", 0.3, 1)).toEqual({
      ok: true,
      spentUsd: 0.3,
      capUsd: 1,
    });
  });
});

describe("createDynamoUsageReservation", () => {
  it("uses a conditional atomic update for reservations", async () => {
    const sent: unknown[] = [];
    const client = {
      send: async (command: unknown) => {
        sent.push(command);
        return { Attributes: { spentUsd: 0.5 } };
      },
    } as unknown as DynamoDBDocumentClient;
    const reservation = createDynamoUsageReservation(client, "portfolio-rate-limit");

    await expect(reservation.reserve("user-1", 0.5, 2)).resolves.toEqual({
      ok: true,
      spentUsd: 0.5,
      capUsd: 2,
    });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      input: {
        TableName: "portfolio-rate-limit",
        ConditionExpression: "attribute_not_exists(#spent) OR #spent <= :cap",
        UpdateExpression: "ADD #spent :delta SET #ttl = :ttl",
      },
    });
  });

  it("propagates store errors instead of silently allowing", async () => {
    const client = {
      send: async () => {
        throw new Error("dynamo unavailable");
      },
    } as unknown as DynamoDBDocumentClient;
    const reservation = createDynamoUsageReservation(client, "portfolio-rate-limit");

    await expect(reservation.reserve("user-1", 0.5, 2)).rejects.toThrow(
      "dynamo unavailable",
    );
  });
});
