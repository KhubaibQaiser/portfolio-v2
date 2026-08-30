import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getGenerationJobStore: vi.fn(),
  getUsageReservation: vi.fn(),
  ensureAiApiKeys: vi.fn(),
  generateValidatedContent: vi.fn(),
  loadCandidateFacts: vi.fn(),
  getResumeLayoutById: vi.fn(),
  insertResumeGeneration: vi.fn(),
  getResumeData: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@portfolio/ai", () => ({
  ensureAiApiKeys: mocks.ensureAiApiKeys,
}));
vi.mock("@portfolio/ai/schemas", () => ({
  resumeGenerationSuccessSchema: {
    parse: (value: unknown) => value,
  },
}));
vi.mock("@portfolio/ai/guardrails/prompt-injection", () => ({
  wrapUntrusted: (value: string) => value,
}));
vi.mock("@portfolio/data", () => ({
  getContentRepository: () => ({
    getResumeLayoutById: mocks.getResumeLayoutById,
    insertResumeGeneration: mocks.insertResumeGeneration,
  }),
  getGenerationJobStore: mocks.getGenerationJobStore,
  getUsageReservation: mocks.getUsageReservation,
}));
vi.mock("@portfolio/shared/resume-data", () => ({
  getResumeData: mocks.getResumeData,
}));
vi.mock("@portfolio/shared/resume-changes", () => ({
  describeAppliedResumeChanges: () => ["rewrote summary"],
}));
vi.mock("../logger", () => ({
  logger: { info: vi.fn(), warn: mocks.loggerWarn, error: mocks.loggerError },
}));
vi.mock("./generate-validated-content", () => ({
  generateValidatedContent: mocks.generateValidatedContent,
  ValidatedGenerationError: class ValidatedGenerationError extends Error {
    constructor(
      readonly code: string,
      message: string,
      readonly retryable: boolean,
      readonly diagnostics: Array<Record<string, unknown>> = [],
    ) {
      super(message);
      this.name = "ValidatedGenerationError";
    }
  },
}));
vi.mock("./generation-snapshot", () => ({
  createGenerationSnapshot: () => ({
    sourceHash: "source-hash",
    guidelineHash: "guideline-hash",
  }),
}));
vi.mock("./load-candidate-facts-uncached", () => ({
  loadCandidateFactsUncached: mocks.loadCandidateFacts,
}));

import { ValidatedGenerationError } from "./generate-validated-content";
import { processGenerationJob } from "./process-generation-job";

const layout = {
  id: "modern-blue",
  version: 4,
  guidelines: { validation: { maxExperienceItems: 5 } },
};

const generated = {
  resume: {
    summary: "Senior engineer building reliable products for customers.",
    titleOverride: null,
    keywords: ["React"],
    highlightedSkills: ["React"],
    experiences: [],
    skills: [],
  },
  coverLetter: null,
  attempts: [{ model: "claude-haiku-4-5", reason: "initial", latencyMs: 1 }],
  warnings: [],
  usage: { costUsd: 0.01 },
  model: "claude-haiku-4-5",
  fallbackUsed: false,
};

function makeJob(overrides: Record<string, unknown> = {}) {
  return {
    jobId: "job-1",
    createdBy: "admin-1",
    reservationId: "res-1",
    status: "queued" as const,
    generationId: null,
    result: null,
    error: null,
    createdAt: Date.now(),
    payload: {
      kind: "resume",
      jdText: "A sufficiently detailed React engineering job description.",
      jdSource: "paste",
      layoutId: layout.id,
      layoutVersion: layout.version,
      model: "quality",
      role: "Engineer",
    },
    ...overrides,
  };
}

describe("processGenerationJob", () => {
  let store: {
    get: ReturnType<typeof vi.fn>;
    markRunning: ReturnType<typeof vi.fn>;
    markReady: ReturnType<typeof vi.fn>;
    markFailed: ReturnType<typeof vi.fn>;
  };
  let reservation: {
    settle: ReturnType<typeof vi.fn>;
    release: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    store = {
      get: vi.fn(),
      markRunning: vi.fn().mockResolvedValue(undefined),
      markReady: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined),
    };
    reservation = {
      settle: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
    };
    mocks.getGenerationJobStore.mockReturnValue(store);
    mocks.getUsageReservation.mockReturnValue(reservation);
    mocks.ensureAiApiKeys.mockResolvedValue(undefined);
    mocks.loadCandidateFacts.mockResolvedValue({ factSheet: "React facts" });
    mocks.getResumeLayoutById.mockResolvedValue(layout);
    mocks.getResumeData.mockResolvedValue({ name: "Jane Doe", experience: [] });
    mocks.generateValidatedContent.mockResolvedValue(structuredClone(generated));
    mocks.insertResumeGeneration.mockResolvedValue({ id: "generation-id" });
  });

  it("is a no-op for a job that no longer exists", async () => {
    store.get.mockResolvedValue(null);
    await processGenerationJob("missing");
    expect(store.markRunning).not.toHaveBeenCalled();
  });

  it("is a no-op for a job already in a terminal state", async () => {
    store.get.mockResolvedValue(makeJob({ status: "ready" }));
    await processGenerationJob("job-1");
    expect(store.markRunning).not.toHaveBeenCalled();
  });

  it("generates, persists, marks ready, and settles the reservation", async () => {
    store.get.mockResolvedValue(makeJob());
    await processGenerationJob("job-1");

    expect(store.markRunning).toHaveBeenCalledWith("job-1");
    expect(mocks.ensureAiApiKeys).toHaveBeenCalledWith("quality");
    expect(mocks.generateValidatedContent).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "resume",
        modelMode: "quality",
        deadlineAt: expect.any(Number),
      }),
    );
    expect(mocks.insertResumeGeneration).toHaveBeenCalledOnce();
    expect(store.markReady).toHaveBeenCalledWith(
      "job-1",
      "generation-id",
      expect.objectContaining({ generationId: "generation-id" }),
    );
    expect(reservation.settle).toHaveBeenCalledWith("admin-1", "res-1", 0.01);
    expect(reservation.release).not.toHaveBeenCalled();
  });

  it("marks the job failed and releases the reservation on validation errors", async () => {
    store.get.mockResolvedValue(makeJob());
    mocks.generateValidatedContent.mockRejectedValue(
      new ValidatedGenerationError(
        "GENERATION_TIMEOUT",
        "Resume generation ran out of time. Try again.",
        true,
        [
          {
            artifact: "resume",
            model: "claude-haiku-4-5",
            provider: "anthropic",
            attempt: 1,
            retry: 0,
            category: "timeout_or_abort",
            errorName: "TimeoutError",
            latencyMs: 40_000,
            remainingMsAtFailure: 100,
          },
        ],
      ),
    );

    await processGenerationJob("job-1");

    expect(store.markFailed).toHaveBeenCalledWith("job-1", {
      code: "GENERATION_TIMEOUT",
      message: "Resume generation ran out of time. Try again.",
      retryable: true,
    });
    expect(reservation.release).toHaveBeenCalledWith("admin-1", "res-1");
    expect(store.markReady).not.toHaveBeenCalled();
  });

  it("marks the job failed, releases, and rethrows unexpected errors", async () => {
    store.get.mockResolvedValue(makeJob());
    mocks.generateValidatedContent.mockRejectedValue(new Error("boom"));

    await expect(processGenerationJob("job-1")).rejects.toThrow("boom");
    expect(store.markFailed).toHaveBeenCalledWith(
      "job-1",
      expect.objectContaining({ code: "PERSISTENCE_FAILED", retryable: true }),
    );
    expect(reservation.release).toHaveBeenCalledWith("admin-1", "res-1");
  });
});
