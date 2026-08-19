import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getRenderJob: vi.fn(),
  getObject: vi.fn(),
}));

vi.mock("@portfolio/data", () => ({
  getRenderJobStore: () => ({ get: mocks.getRenderJob }),
}));
vi.mock("@portfolio/data/media", () => ({
  getMediaStore: async () => ({ getObject: mocks.getObject }),
}));
vi.mock("@/lib/auth-guard", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { GET } from "./route";

function request(jobId?: string): Request {
  const url = new URL("https://admin.example.com/api/resume/export/download");
  if (jobId) url.searchParams.set("jobId", jobId);
  return new Request(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ ok: true, id: "admin-1", email: "a@b.com" });
});

describe("GET /api/resume/export/download", () => {
  it("rejects unauthenticated requests", async () => {
    mocks.requireAdmin.mockResolvedValue({ ok: false, error: "Unauthorized" });
    const res = await GET(request("job-1"));
    expect(res.status).toBe(401);
  });

  it("404s when the job belongs to another user", async () => {
    mocks.getRenderJob.mockResolvedValue({ createdBy: "someone-else", status: "ready" });
    const res = await GET(request("job-1"));
    expect(res.status).toBe(404);
  });

  it("409s when the job isn't ready yet", async () => {
    mocks.getRenderJob.mockResolvedValue({ createdBy: "admin-1", status: "rendering" });
    const res = await GET(request("job-1"));
    expect(res.status).toBe(409);
  });

  it("500s when the job is ready but the object is missing", async () => {
    mocks.getRenderJob.mockResolvedValue({
      createdBy: "admin-1",
      status: "ready",
      objectKey: "render-jobs/job-1.pdf",
    });
    mocks.getObject.mockResolvedValue(null);
    const res = await GET(request("job-1"));
    expect(res.status).toBe(500);
  });

  it("serves the PDF bytes with the job's filename", async () => {
    mocks.getRenderJob.mockResolvedValue({
      createdBy: "admin-1",
      status: "ready",
      objectKey: "render-jobs/job-1.pdf",
      filename: "Jane-Doe-Resume.pdf",
    });
    mocks.getObject.mockResolvedValue({ body: new Uint8Array([1, 2, 3]) });
    const res = await GET(request("job-1"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain("Jane-Doe-Resume.pdf");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([...bytes]).toEqual([1, 2, 3]);
  });
});
