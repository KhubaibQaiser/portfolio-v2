import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  checkRateLimit: vi.fn(),
  reserveAiUsage: vi.fn(),
  estimateGenerationReservationUsd: vi.fn(() => 0.25),
  ensureAiApiKeys: vi.fn(),
  generateValidatedContent: vi.fn(),
  renderResumePdfBuffer: vi.fn(),
  loadCandidateFacts: vi.fn(),
  insertResumeGeneration: vi.fn(),
  getResumeLayouts: vi.fn(),
  getResumeData: vi.fn(),
  loggerWarn: vi.fn(),
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
    warn: mocks.loggerWarn,
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
      readonly diagnostics: Array<Record<string, unknown>> = [],
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
  reserveAiUsage: mocks.reserveAiUsage,
  estimateGenerationReservationUsd: mocks.estimateGenerationReservationUsd,
}));

import {
  ValidatedGenerationError,
  type GenerationFailureDiagnostic,
} from "@/lib/resume-ai/generate-validated-content";
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
      model: "claude-haiku-4-5",
      reason: "initial",
      finishReason: "stop",
      latencyMs: 1,
    },
  ],
  warnings: [],
  usage: { costUsd: 0.01 },
  model: "claude-haiku-4-5",
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
    mocks.reserveAiUsage.mockResolvedValue({
      ok: true,
      reservation: {
        settle: vi.fn().mockResolvedValue(undefined),
        release: vi.fn().mockResolvedValue(undefined),
      },
      reservedUsd: 0.25,
    });
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
        modelMode: "quality",
        deadlineAt: expect.any(Number),
        signal: expect.any(AbortSignal),
      }),
    );
    const payload = mocks.generateValidatedContent.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(payload).not.toHaveProperty("tone");
    expect(payload).not.toHaveProperty("length");
    expect(payload).not.toHaveProperty("language");
    expect(mocks.estimateGenerationReservationUsd).toHaveBeenCalledWith("quality");
    expect(mocks.ensureAiApiKeys).toHaveBeenCalledWith("quality");
    expect(mocks.renderResumePdfBuffer).toHaveBeenCalledOnce();
    expect(mocks.insertResumeGeneration).toHaveBeenCalledOnce();
  });

  it("rejects unknown generation options such as tone", async () => {
    const response = await POST(request({ tone: "formal" }));

    expect(response.status).toBe(400);
    expect(mocks.generateValidatedContent).not.toHaveBeenCalled();
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
    mocks.reserveAiUsage.mockResolvedValue({
      ok: false,
      spentUsd: 2,
      capUsd: 2,
      reason: "cost-cap",
    });

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

  it("logs sanitized attempt diagnostics for a rejected generation", async () => {
    const diagnostics: GenerationFailureDiagnostic[] = [
      {
        artifact: "resume",
        model: "openai/gpt-oss-120b",
        provider: "groq",
        attempt: 1,
        retry: 0,
        category: "authentication",
        statusCode: 401,
        errorName: "AI_APICallError",
        providerErrorCode: "invalid_api_key",
        latencyMs: 20,
      },
    ];
    mocks.generateValidatedContent.mockRejectedValue(
      new ValidatedGenerationError(
        "PROVIDER_UNAVAILABLE",
        "All configured AI providers are temporarily unavailable.",
        true,
        diagnostics,
      ),
    );

    const response = await POST(request());

    expect(response.status).toBe(422);
    expect(mocks.loggerWarn).toHaveBeenCalledWith(
      "validated resume generation rejected",
      expect.objectContaining({
        code: "PROVIDER_UNAVAILABLE",
        retryable: true,
        attemptDiagnostics: diagnostics,
      }),
    );
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
