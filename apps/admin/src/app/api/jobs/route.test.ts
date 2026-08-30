import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  queryByStatus: vi.fn(),
  countByStatus: vi.fn(),
  getById: vi.fn(),
  getJobPreferences: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@/lib/auth-guard", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@portfolio/data", () => ({
  getJobBoardRepository: () => ({
    queryByStatus: mocks.queryByStatus,
    countByStatus: mocks.countByStatus,
    getById: mocks.getById,
  }),
  getContentRepository: () => ({ getJobPreferences: mocks.getJobPreferences }),
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: mocks.loggerError },
}));

import { GET } from "./route";

describe("GET /api/jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ ok: true, id: "admin" });
    mocks.queryByStatus.mockResolvedValue({ items: [], nextCursor: null });
    mocks.countByStatus.mockResolvedValue({
      new: 0,
      reviewing: 0,
      applied: 0,
      discarded: 0,
      snoozed: 0,
      closed: 0,
    });
    mocks.getById.mockResolvedValue(null);
    mocks.getJobPreferences.mockResolvedValue({ recommended_job_id: null });
  });

  it("requires admin", async () => {
    mocks.requireAdmin.mockResolvedValue({ ok: false, error: "Unauthorized" });
    const response = await GET(new Request("https://admin.example.com/api/jobs"));
    expect(response.status).toBe(401);
  });

  it("lists jobs for the requested status", async () => {
    const response = await GET(
      new Request("https://admin.example.com/api/jobs?status=applied"),
    );
    expect(response.status).toBe(200);
    expect(mocks.queryByStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: "applied" }),
    );
    expect(mocks.countByStatus).toHaveBeenCalled();
  });

  it("passes band filter and returns recommended job", async () => {
    const recommended = { id: "rec-1", title: "Staff" };
    mocks.getJobPreferences.mockResolvedValue({ recommended_job_id: "rec-1" });
    mocks.getById.mockResolvedValue(recommended);
    const response = await GET(
      new Request("https://admin.example.com/api/jobs?status=new&band=strong"),
    );
    expect(response.status).toBe(200);
    expect(mocks.queryByStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: "new", band: "strong" }),
    );
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        recommendedJobId: "rec-1",
        recommended,
      }),
    );
  });

  it("rejects invalid band", async () => {
    const response = await GET(
      new Request("https://admin.example.com/api/jobs?band=legendary"),
    );
    expect(response.status).toBe(400);
  });

  it("logs a structured ERROR and returns 500 when the query fails", async () => {
    mocks.queryByStatus.mockRejectedValue(new Error("Requested resource not found"));
    const response = await GET(
      new Request("https://admin.example.com/api/jobs?status=new"),
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to list jobs" });
    expect(mocks.loggerError).toHaveBeenCalledWith(
      "GET /api/jobs failed",
      expect.objectContaining({
        status: "new",
        error: expect.any(Error),
      }),
    );
  });
});
