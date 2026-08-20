import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  checkRateLimit: vi.fn(),
  reserveAiUsage: vi.fn(),
  estimateGenerationReservationUsd: vi.fn(() => 0.25),
  getResumeLayouts: vi.fn(),
  createJob: vi.fn(),
  enqueue: vi.fn(),
  getGenerationJobQueue: vi.fn(),
  processGenerationJob: vi.fn(),
  loggerWarn: vi.fn(),
}));

vi.mock("@portfolio/ai/context/trim-job-description", () => ({
  trimJobDescription: (value: string) => value,
}));
vi.mock("@portfolio/ai/guardrails/prompt-injection", () => ({
  stripPromptInjection: (value: string) => value,
}));
vi.mock("@portfolio/data", () => ({
  getContentRepository: () => ({
    getResumeLayouts: mocks.getResumeLayouts,
  }),
  getGenerationJobStore: () => ({ create: mocks.createJob }),
  getGenerationJobQueue: mocks.getGenerationJobQueue,
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
vi.mock("@/lib/resume-ai/rate-limit", () => ({
  checkResumeAiRateLimit: mocks.checkRateLimit,
}));
vi.mock("@/lib/resume-ai/cost-cap", () => ({
  reserveAiUsage: mocks.reserveAiUsage,
  estimateGenerationReservationUsd: mocks.estimateGenerationReservationUsd,
}));
vi.mock("@/lib/resume-ai/process-generation-job", () => ({
  processGenerationJob: mocks.processGenerationJob,
}));

import { POST } from "./route";

const layout = {
  id: "modern-blue",
  version: 4,
  component_key: "modern-blue",
  guidelines: {},
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
      reservationId: "res-1",
      reservedUsd: 0.25,
    });
    mocks.getResumeLayouts.mockResolvedValue([layout]);
    mocks.createJob.mockResolvedValue({ jobId: "job-1" });
    mocks.enqueue.mockResolvedValue(undefined);
    mocks.getGenerationJobQueue.mockReturnValue({ enqueue: mocks.enqueue });
    mocks.processGenerationJob.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("enqueues a generation job and returns 202", async () => {
    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toEqual({ jobId: "job-1", status: "queued" });
    expect(mocks.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        createdBy: "admin-id",
        reservationId: "res-1",
        payload: expect.objectContaining({
          kind: "resume",
          layoutId: layout.id,
          model: "quality",
        }),
      }),
    );
    expect(mocks.enqueue).toHaveBeenCalledWith({ jobId: "job-1" });
    expect(mocks.processGenerationJob).not.toHaveBeenCalled();
    expect(mocks.estimateGenerationReservationUsd).toHaveBeenCalledWith("quality");
  });

  it("forwards body.model to the reservation and job payload", async () => {
    const response = await POST(request({ model: "fast" }));

    expect(response.status).toBe(202);
    expect(mocks.estimateGenerationReservationUsd).toHaveBeenCalledWith("fast");
    expect(mocks.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ model: "fast" }),
      }),
    );
  });

  it("processes the job inline when no queue is configured", async () => {
    mocks.getGenerationJobQueue.mockReturnValue(null);

    const response = await POST(request());

    expect(response.status).toBe(202);
    expect(mocks.enqueue).not.toHaveBeenCalled();
    expect(mocks.processGenerationJob).toHaveBeenCalledWith("job-1");
  });

  it("rejects unknown generation options such as tone", async () => {
    const response = await POST(request({ tone: "formal" }));

    expect(response.status).toBe(400);
    expect(mocks.createJob).not.toHaveBeenCalled();
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
    expect(mocks.createJob).not.toHaveBeenCalled();
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
    expect(mocks.createJob).not.toHaveBeenCalled();
  });

  it("rejects a missing selected layout", async () => {
    const response = await POST(request({ layoutId: "removed-layout" }));

    expect(response.status).toBe(400);
    expect(mocks.createJob).not.toHaveBeenCalled();
  });
});
