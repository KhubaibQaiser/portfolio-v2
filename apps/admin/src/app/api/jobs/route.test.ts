import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  queryByStatus: vi.fn(),
  getJobPreferences: vi.fn(),
}));

vi.mock("@/lib/auth-guard", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@portfolio/data", () => ({
  getJobBoardRepository: () => ({ queryByStatus: mocks.queryByStatus }),
  getContentRepository: () => ({ getJobPreferences: mocks.getJobPreferences }),
}));

import { GET } from "./route";

describe("GET /api/jobs", () => {
  beforeEach(() => {
    mocks.requireAdmin.mockResolvedValue({ ok: true, id: "admin" });
    mocks.queryByStatus.mockResolvedValue({ items: [], nextCursor: null });
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
  });
});
