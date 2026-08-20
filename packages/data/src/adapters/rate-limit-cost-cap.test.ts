import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { describe, expect, it, vi } from "vitest";
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

    const first = await reservation.reserve("user-1", 0.5, 1);
    expect(first).toMatchObject({ ok: true, spentUsd: 0.5, capUsd: 1 });
    if (!first.ok) throw new Error("expected reservation to succeed");
    await reservation.settle("user-1", first.reservationId, 0.25);

    const second = await reservation.reserve("user-1", 0.75, 1);
    expect(second).toMatchObject({ ok: true, spentUsd: 1, capUsd: 1 });
    if (!second.ok) throw new Error("expected reservation to succeed");
    await reservation.release("user-1", second.reservationId);

    expect(await reservation.reserve("user-1", 0.25, 1)).toMatchObject({
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
      spentUsd: 0.8,
      capUsd: 1,
      reason: "cost-cap",
    });
    expect(await reservation.reserve("user-2", 0.3, 1)).toMatchObject({
      ok: true,
      spentUsd: 0.3,
      capUsd: 1,
    });
  });

  it("self-heals: an unresolved hold stops counting toward the cap once expired", async () => {
    vi.useFakeTimers();
    try {
      const reservation = createMemoryUsageReservation();
      await reservation.reserve("user-1", 0.9, 1);
      // Never settled or released — simulates a killed request.
      expect(await reservation.reserve("user-1", 0.5, 1)).toMatchObject({
        ok: false,
        reason: "cost-cap",
      });

      vi.advanceTimersByTime(11 * 60 * 1000);

      expect(await reservation.reserve("user-1", 0.5, 1)).toMatchObject({
        ok: true,
        spentUsd: 0.5,
        capUsd: 1,
      });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("createDynamoUsageReservation", () => {
  it("queries live holds and settled spend, then writes a new short-TTL hold", async () => {
    const sent: unknown[] = [];
    const client = {
      send: async (command: unknown) => {
        sent.push(command);
        if (
          (command as { constructor: { name: string } }).constructor.name ===
          "QueryCommand"
        ) {
          return { Items: [] };
        }
        return {};
      },
    } as unknown as DynamoDBDocumentClient;
    const reservation = createDynamoUsageReservation(client, "portfolio-rate-limit");

    const result = await reservation.reserve("user-1", 0.5, 2);
    expect(result).toMatchObject({ ok: true, spentUsd: 0.5, capUsd: 2 });
    if (!result.ok) throw new Error("expected reservation to succeed");
    expect(typeof result.reservationId).toBe("string");
    expect(result.reservationId.length).toBeGreaterThan(0);

    expect(sent).toHaveLength(2);
    expect(sent[0]).toMatchObject({
      input: { TableName: "portfolio-rate-limit", KeyConditionExpression: "pk = :pk" },
    });
    expect(sent[1]).toMatchObject({
      input: {
        TableName: "portfolio-rate-limit",
        Item: expect.objectContaining({ pk: "USAGE#ai#user-1", amountUsd: 0.5 }),
      },
    });
  });

  const WINDOW_SEC = 24 * 60 * 60;
  function currentWindowStart(): number {
    return Math.floor(Math.floor(Date.now() / 1000) / WINDOW_SEC) * WINDOW_SEC;
  }

  it("denies the reservation when settled spend plus live holds would exceed the cap", async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const client = {
      send: async (command: unknown) => {
        if (
          (command as { constructor: { name: string } }).constructor.name ===
          "QueryCommand"
        ) {
          return {
            Items: [
              {
                sk: `HOLD#${currentWindowStart()}#reservation-1`,
                amountUsd: 1.8,
                ttl: nowSec + 300,
              },
            ],
          };
        }
        return {};
      },
    } as unknown as DynamoDBDocumentClient;
    const reservation = createDynamoUsageReservation(client, "portfolio-rate-limit");

    await expect(reservation.reserve("user-1", 0.5, 2)).resolves.toMatchObject({
      ok: false,
      reason: "cost-cap",
    });
  });

  it("ignores holds whose TTL has already passed", async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const client = {
      send: async (command: unknown) => {
        if (
          (command as { constructor: { name: string } }).constructor.name ===
          "QueryCommand"
        ) {
          return {
            Items: [
              {
                sk: `HOLD#${currentWindowStart()}#reservation-1`,
                amountUsd: 1.8,
                ttl: nowSec - 1,
              },
            ],
          };
        }
        return {};
      },
    } as unknown as DynamoDBDocumentClient;
    const reservation = createDynamoUsageReservation(client, "portfolio-rate-limit");

    await expect(reservation.reserve("user-1", 0.5, 2)).resolves.toMatchObject({
      ok: true,
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
