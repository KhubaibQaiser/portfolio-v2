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
vi.mock("@portfolio/shared/schemas", () => ({
  pickDefaultResumeLayout: vi.fn((layouts: unknown[]) => layouts[0] ?? null),
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

beforeEach(() => {
  vi.clearAllMocks();
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
    });
    expect(response.headers.get("cache-control")).toContain("s-maxage=10");
  });
});
