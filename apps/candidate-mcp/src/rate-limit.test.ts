import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRateLimiter } from "@portfolio/data";
import { checkRateLimit } from "./rate-limit";

const { check } = vi.hoisted(() => ({ check: vi.fn() }));

vi.mock("@portfolio/data", () => ({
  getRateLimiter: vi.fn(() => ({ check })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkRateLimit", () => {
  it("checks the limiter with a distinct prefix, scoped by client_id", async () => {
    check.mockResolvedValue({ ok: true });

    const result = await checkRateLimit("n8n-workflow", {
      rateLimitMax: 30,
      rateLimitWindowSec: 60,
    });

    expect(result).toEqual({ ok: true });
    expect(getRateLimiter).toHaveBeenCalledTimes(1);
    expect(check).toHaveBeenCalledWith("n8n-workflow", {
      max: 30,
      windowSec: 60,
      prefix: "candidate-mcp",
    });
  });

  it("surfaces the retry-after window when the limit is exceeded", async () => {
    check.mockResolvedValue({
      ok: false,
      retryAfterSeconds: 42,
      limit: 30,
      remaining: 0,
    });

    const result = await checkRateLimit("n8n-workflow", {
      rateLimitMax: 30,
      rateLimitWindowSec: 60,
    });

    expect(result).toEqual({ ok: false, retryAfterSeconds: 42 });
  });
});
