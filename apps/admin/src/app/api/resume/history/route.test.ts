import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getResumeGenerations: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@/lib/auth-guard", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@portfolio/data", () => ({
  getContentRepository: () => ({ getResumeGenerations: mocks.getResumeGenerations }),
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: mocks.loggerError },
}));

import { GET } from "./route";

describe("GET /api/resume/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ ok: true, id: "admin" });
    mocks.getResumeGenerations.mockResolvedValue([]);
  });

  it("requires admin", async () => {
    mocks.requireAdmin.mockResolvedValue({ ok: false, error: "Unauthorized" });
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("logs a structured ERROR and returns 500 when the query fails", async () => {
    mocks.getResumeGenerations.mockRejectedValue(
      new Error("Requested resource not found"),
    );
    const response = await GET();
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to load generation history",
    });
    expect(mocks.loggerError).toHaveBeenCalledWith(
      "GET /api/resume/history failed",
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });
});
