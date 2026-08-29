import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getGenerationJob: vi.fn(),
}));

vi.mock("@portfolio/data", () => ({
  getGenerationJobStore: () => ({ get: mocks.getGenerationJob }),
}));
vi.mock("@/lib/auth-guard", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
}));

import { GET } from "./route";

function request(jobId?: string): Request {
  const url = new URL("https://admin.example.com/api/resume/generate/status");
  if (jobId) url.searchParams.set("jobId", jobId);
  return new Request(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ ok: true, id: "admin-1", email: "a@b.com" });
});

describe("GET /api/resume/generate/status", () => {
  it("rejects unauthenticated requests", async () => {
    mocks.requireAdmin.mockResolvedValue({ ok: false, error: "Unauthorized" });
    const res = await GET(request("job-1"));
    expect(res.status).toBe(401);
  });

  it("400s when jobId is missing", async () => {
    const res = await GET(request());
    expect(res.status).toBe(400);
  });

  it("404s when the job doesn't exist", async () => {
    mocks.getGenerationJob.mockResolvedValue(null);
    const res = await GET(request("missing"));
    expect(res.status).toBe(404);
  });

  it("404s when the job belongs to another user", async () => {
    mocks.getGenerationJob.mockResolvedValue({
      createdBy: "someone-else",
      status: "ready",
    });
    const res = await GET(request("job-1"));
    expect(res.status).toBe(404);
  });

  it("returns status/result/error without leaking reservation ids", async () => {
    mocks.getGenerationJob.mockResolvedValue({
      createdBy: "admin-1",
      status: "ready",
      result: { generationId: "gen-1" },
      error: null,
      reservationId: "res-secret",
    });
    const res = await GET(request("job-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      status: "ready",
      result: { generationId: "gen-1" },
      error: null,
    });
    expect(JSON.stringify(json)).not.toContain("res-secret");
  });

  it("logs and returns 500 when the store throws", async () => {
    mocks.getGenerationJob.mockRejectedValue(new Error("Dynamo down"));
    const res = await GET(request("job-1"));
    expect(res.status).toBe(500);
  });
});
