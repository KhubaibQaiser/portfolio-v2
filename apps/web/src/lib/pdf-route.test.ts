import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderResumePdfBuffer } from "@portfolio/ui/resume-pdf";
import { GET } from "@/app/api/pdf/route";
import { checkResumePdfRateLimit } from "@/lib/resume-pdf-rate-limit";

const resumeData = {
  name: "Test User",
  title: "Engineer",
};
const layout = { id: "modern-blue" };

vi.mock("@portfolio/ui/resume-pdf", () => ({
  renderResumePdfBuffer: vi.fn(),
}));
vi.mock("@portfolio/shared/resume-data", () => ({
  projectCanonicalResume: vi.fn((data: unknown) => data),
}));
vi.mock("@portfolio/shared/schemas", () => ({
  pickDefaultResumeLayout: vi.fn((layouts: unknown[]) => layouts[0] ?? null),
  classicGuidelines: vi.fn(() => ({})),
}));
vi.mock("@portfolio/data", () => ({
  getContentRepository: vi.fn(() => ({
    getResumeLayouts: vi.fn(async () => [{ id: "modern-blue" }]),
  })),
}));
vi.mock("@/lib/resume-data", () => ({
  getResumeData: vi.fn(async () => ({
    name: "Test User",
    title: "Engineer",
  })),
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/resume-pdf-rate-limit", () => ({
  checkResumePdfRateLimit: vi.fn(),
}));
vi.mock("next/server", () => ({ after: vi.fn() }));

const getObject = vi.fn(
  async () => null as { body: Uint8Array; metadata?: Record<string, string> } | null,
);
const uploadObject = vi.fn(async () => {});
vi.mock("@portfolio/data/media", () => ({
  getMediaStore: vi.fn(async () => ({ getObject, uploadObject })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  getObject.mockResolvedValue(null);
});

describe("public PDF route", () => {
  it("returns a stable 429 response before rendering", async () => {
    vi.mocked(checkResumePdfRateLimit).mockResolvedValue({
      ok: false,
      retryAfterSeconds: 42,
      limit: 5,
      remaining: 0,
    });

    const response = await GET(new Request("https://example.com/api/pdf"));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
    expect(renderResumePdfBuffer).not.toHaveBeenCalled();
  });

  it("renders in canonical mode and retains short-lived caching", async () => {
    vi.mocked(checkResumePdfRateLimit).mockResolvedValue({ ok: true });
    vi.mocked(renderResumePdfBuffer).mockResolvedValue({
      buffer: Buffer.from("%PDF-test"),
      fitReport: null,
    });

    const response = await GET(new Request("https://example.com/api/pdf"));

    expect(response.status).toBe(200);
    expect(renderResumePdfBuffer).toHaveBeenCalledWith(resumeData, layout, {
      mode: "canonical",
      fit: "guidelines-only",
      deadlineAt: expect.any(Number),
    });
    expect(response.headers.get("cache-control")).toContain("s-maxage=10");
  });

  it("serves the cached PDF without rendering when the content hash matches", async () => {
    vi.mocked(checkResumePdfRateLimit).mockResolvedValue({ ok: true });
    const { hashCanonicalResumeContent } = await import("@/lib/resume-pdf-cache");
    const contentHash = hashCanonicalResumeContent(resumeData as never, layout as never);
    getObject.mockResolvedValue({
      body: new Uint8Array([1, 2, 3]),
      metadata: { "content-hash": contentHash },
    });

    const response = await GET(new Request("https://example.com/api/pdf"));

    expect(response.status).toBe(200);
    expect(renderResumePdfBuffer).not.toHaveBeenCalled();
    expect(uploadObject).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("s-maxage=10");
  });

  it("falls back to rendering when the cached hash is stale", async () => {
    vi.mocked(checkResumePdfRateLimit).mockResolvedValue({ ok: true });
    vi.mocked(renderResumePdfBuffer).mockResolvedValue({
      buffer: Buffer.from("%PDF-fresh"),
      fitReport: null,
    });
    getObject.mockResolvedValue({
      body: new Uint8Array([9, 9]),
      metadata: { "content-hash": "stale-hash" },
    });

    const response = await GET(new Request("https://example.com/api/pdf"));

    expect(response.status).toBe(200);
    expect(renderResumePdfBuffer).toHaveBeenCalled();
  });

  it("does not import @portfolio/ai", async () => {
    const source = await readFile(
      new URL("../app/api/pdf/route.tsx", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(/from\s+["']@portfolio\/ai/);
  });
});
