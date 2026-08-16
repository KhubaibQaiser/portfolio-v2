import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  checkRateLimit: vi.fn(),
  checkCostCap: vi.fn(),
  ensureAiApiKeys: vi.fn(),
  generateValidatedContent: vi.fn(),
  renderResumePdfBuffer: vi.fn(),
  loadCandidateFacts: vi.fn(),
  insertResumeGeneration: vi.fn(),
  getResumeLayouts: vi.fn(),
  getResumeData: vi.fn(),
}));

vi.mock("@portfolio/ai", () => ({
  ensureAiApiKeys: mocks.ensureAiApiKeys,
}));
vi.mock("@portfolio/ai/schemas", () => ({
  resumeGenerationSuccessSchema: {
    parse: (value: unknown) => value,
  },
}));
vi.mock("@portfolio/ai/context/trim-job-description", () => ({
  trimJobDescription: (value: string) => value,
}));
vi.mock("@portfolio/ai/guardrails/prompt-injection", () => ({
  stripPromptInjection: (value: string) => value,
  wrapUntrusted: (value: string) => value,
}));
vi.mock("@portfolio/data", () => ({
  getContentRepository: () => ({
    getResumeLayouts: mocks.getResumeLayouts,
    insertResumeGeneration: mocks.insertResumeGeneration,
  }),
}));
vi.mock("@portfolio/shared/resume-data", () => ({
  applyTailoredResume: (value: unknown) => value,
  getResumeData: mocks.getResumeData,
  getValidatedHighlightedSkills: () => [],
}));
vi.mock("@portfolio/shared/resume-changes", () => ({
  describeAppliedResumeChanges: () => [],
}));
vi.mock("@portfolio/ui/resume-pdf", () => ({
  renderResumePdfBuffer: mocks.renderResumePdfBuffer,
}));
vi.mock("@portfolio/shared/schemas", () => ({
  pickDefaultResumeLayout: (layouts: unknown[]) => layouts[0],
}));
vi.mock("@/lib/auth-guard", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock("@/lib/resume-ai/generate-validated-content", () => ({
  generateValidatedContent: mocks.generateValidatedContent,
  ValidatedGenerationError: class ValidatedGenerationError extends Error {
    constructor(
      readonly code: string,
      message: string,
      readonly retryable: boolean,
    ) {
      super(message);
    }
  },
}));
vi.mock("@/lib/resume-ai/generation-snapshot", () => ({
  createGenerationSnapshot: () => ({
    sourceHash: "source-hash",
    guidelineHash: "guideline-hash",
  }),
}));
vi.mock("@/lib/resume-ai/load-candidate-facts", () => ({
  loadCandidateFactsUncached: mocks.loadCandidateFacts,
}));
vi.mock("@/lib/resume-ai/rate-limit", () => ({
  checkResumeAiRateLimit: mocks.checkRateLimit,
}));
vi.mock("@/lib/resume-ai/cost-cap", () => ({
  checkCostCap: mocks.checkCostCap,
}));

import { POST } from "./route";

const resume = {
  summary: "Senior engineer building reliable products for customers.",
  titleOverride: null,
  keywords: ["React"],
  highlightedSkills: ["React"],
  experiences: [],
  skills: [],
};

const guidelines = {
  validation: {
    maxExperienceItems: 5,
    maxBulletsPerRole: 4,
    maxPageCount: 1,
  },
  formatting: {
    layout: {
      maxBulletsPerJob: 4,
    },
  },
};

const layout = {
  id: "modern-blue",
  version: 4,
  component_key: "modern-blue",
  guidelines,
};

const generated = {
  resume,
  coverLetter: null,
  attempts: [
    {
      model: "claude-sonnet-4-5",
      reason: "initial",
      finishReason: "stop",
      latencyMs: 1,
    },
  ],
  warnings: [],
  usage: { costUsd: 0.01 },
  model: "claude-sonnet-4-5",
  fallbackUsed: false,
};

function request(body: Record<string, unknown> = {}): Request {
  return new Request("https://admin.example.com/api/resume/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "resume",
      jobDescription: "A sufficiently detailed React engineering job description.",
      layoutId: layout.id,
      ...body,
    }),
  });
}

describe("POST /api/resume/generate", () => {
  beforeEach(() => {
    mocks.requireAdmin.mockResolvedValue({ ok: true, id: "admin-id" });
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
    mocks.checkCostCap.mockResolvedValue({ ok: true });
    mocks.ensureAiApiKeys.mockResolvedValue(undefined);
    mocks.getResumeLayouts.mockResolvedValue([layout]);
    mocks.loadCandidateFacts.mockResolvedValue({ factSheet: "React engineering facts" });
    mocks.getResumeData.mockResolvedValue({ experience: [], skills: [] });
    mocks.generateValidatedContent.mockResolvedValue(structuredClone(generated));
    mocks.renderResumePdfBuffer.mockResolvedValue({
      buffer: Buffer.from("pdf"),
      fitReport: { pageCount: 1 },
    });
    mocks.insertResumeGeneration.mockResolvedValue({ id: "generation-id" });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("returns a persisted validated generation", async () => {
    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.generationId).toBe("generation-id");
    expect(mocks.generateValidatedContent).toHaveBeenCalledWith(
      expect.objectContaining({
        deadlineAt: expect.any(Number),
        signal: expect.any(AbortSignal),
      }),
    );
    expect(mocks.renderResumePdfBuffer).toHaveBeenCalledOnce();
    expect(mocks.insertResumeGeneration).toHaveBeenCalledOnce();
  });

  it("rejects a rate-limited request before calling a provider", async () => {
    mocks.checkRateLimit.mockResolvedValue({
      ok: false,
      retryAfterSeconds: 60,
      limit: 10,
      remaining: 0,
    });

    const response = await POST(request());

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(mocks.generateValidatedContent).not.toHaveBeenCalled();
  });

  it("rejects a request when the daily cost cap is exhausted", async () => {
    mocks.checkCostCap.mockResolvedValue({ ok: false });

    const response = await POST(request());

    expect(response.status).toBe(402);
    expect(mocks.generateValidatedContent).not.toHaveBeenCalled();
  });

  it("rejects a missing selected layout", async () => {
    mocks.getResumeLayouts.mockResolvedValue([layout]);

    const response = await POST(request({ layoutId: "removed-layout" }));

    expect(response.status).toBe(400);
    expect(mocks.generateValidatedContent).not.toHaveBeenCalled();
  });

  it("skips the initial fit render when generation consumed its headroom", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-16T07:00:00Z"));
    mocks.generateValidatedContent.mockImplementation(async () => {
      vi.setSystemTime(new Date("2026-08-16T07:00:40Z"));
      return structuredClone(generated);
    });

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.renderResumePdfBuffer).not.toHaveBeenCalled();
    expect(body.metadata.warnings).toEqual([
      expect.stringContaining("Skipped the initial page-fit check"),
    ]);
  });
});
