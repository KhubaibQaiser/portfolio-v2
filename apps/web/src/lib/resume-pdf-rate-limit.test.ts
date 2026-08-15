import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRateLimiter } from "@portfolio/data";
import { checkResumePdfRateLimit } from "./resume-pdf-rate-limit";

const { check } = vi.hoisted(() => ({ check: vi.fn() }));

vi.mock("@portfolio/data", () => ({
  getRateLimiter: vi.fn(() => ({ check })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  check.mockResolvedValue({ ok: true });
});

describe("checkResumePdfRateLimit", () => {
  it("limits public PDF generation to five requests per minute per IP", async () => {
    const request = new Request("https://example.com/api/pdf", {
      headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
    });

    await checkResumePdfRateLimit(request);

    expect(getRateLimiter).toHaveBeenCalledTimes(1);
    expect(check).toHaveBeenCalledWith("ip:203.0.113.10", {
      max: 5,
      windowSec: 60,
      prefix: "resume-pdf",
    });
  });
});
