import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createMemoryChatResponseCache } from "./memory-chat-response-cache";

describe("createMemoryChatResponseCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for missing keys", async () => {
    const cache = createMemoryChatResponseCache();
    expect(await cache.get("missing")).toBeNull();
  });

  it("stores and returns text before TTL", async () => {
    const cache = createMemoryChatResponseCache();
    await cache.set("k1", "hello", 60);

    const hit = await cache.get("k1");
    expect(hit?.text).toBe("hello");
    expect(hit?.expiresAtSec).toBe(
      Math.floor(new Date("2026-07-19T12:00:00.000Z").getTime() / 1000) + 60,
    );
  });

  it("expires entries after TTL", async () => {
    const cache = createMemoryChatResponseCache();
    await cache.set("k1", "hello", 30);

    vi.setSystemTime(new Date("2026-07-19T12:00:31.000Z"));
    expect(await cache.get("k1")).toBeNull();
  });
});
