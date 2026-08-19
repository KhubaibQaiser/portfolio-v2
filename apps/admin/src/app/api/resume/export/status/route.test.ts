import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getRenderJob: vi.fn(),
}));

vi.mock("@portfolio/data", () => ({
  getRenderJobStore: () => ({ get: mocks.getRenderJob }),
}));
vi.mock("@/lib/auth-guard", () => ({
  requireAdmin: mocks.requireAdmin,
}));

import { GET } from "./route";

function request(jobId?: string): Request {
  const url = new URL("https://admin.example.com/api/resume/export/status");
  if (jobId) url.searchParams.set("jobId", jobId);
  return new Request(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ ok: true, id: "admin-1", email: "a@b.com" });
});

describe("GET /api/resume/export/status", () => {
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
    mocks.getRenderJob.mockResolvedValue(null);
    const res = await GET(request("missing"));
    expect(res.status).toBe(404);
  });

  it("404s when the job belongs to another user", async () => {
    mocks.getRenderJob.mockResolvedValue({ createdBy: "someone-else", status: "ready" });
    const res = await GET(request("job-1"));
    expect(res.status).toBe(404);
  });

  it("returns status/error/fitReport without leaking the object key", async () => {
    mocks.getRenderJob.mockResolvedValue({
      createdBy: "admin-1",
      status: "ready",
      error: null,
      fitReport: { pageCount: 1 },
      objectKey: "render-jobs/job-1.pdf",
    });
    const res = await GET(request("job-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ status: "ready", error: null, fitReport: { pageCount: 1 } });
  });
});
