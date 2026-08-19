import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getResumeGenerationById: vi.fn(),
  getResumeLayouts: vi.fn(),
  getResumeLayoutById: vi.fn(),
  getResumeData: vi.fn(),
  loadCandidateFacts: vi.fn(),
  createRenderJob: vi.fn(),
  getRenderJobQueue: vi.fn(),
  processRenderJob: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@portfolio/ai/guardrails/output-sanitize", () => ({
  sanitizeLlmObject: (value: unknown) => value,
}));
vi.mock("@portfolio/ai/policy/resume-generation-policy", () => ({
  enforceResumeGenerationPolicy: (candidate: unknown) => ({
    resume: candidate,
    warnings: [],
  }),
}));
vi.mock("@portfolio/data", () => ({
  getContentRepository: () => ({
    getResumeGenerationById: mocks.getResumeGenerationById,
    getResumeLayouts: mocks.getResumeLayouts,
    getResumeLayoutById: mocks.getResumeLayoutById,
  }),
  getRenderJobStore: () => ({ create: mocks.createRenderJob }),
  getRenderJobQueue: mocks.getRenderJobQueue,
}));
vi.mock("@portfolio/shared/resume-data", () => ({
  getResumeData: mocks.getResumeData,
}));
vi.mock("@/lib/auth-guard", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: mocks.loggerError },
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
vi.mock("@/lib/resume-ai/process-render-job", () => ({
  processRenderJob: mocks.processRenderJob,
  safeFileName: (parts: (string | undefined)[]) =>
    parts
      .filter(Boolean)
      .join("-")
      .replace(/[^a-zA-Z0-9-]/g, ""),
}));

import { POST } from "./route";

const resume = {
  summary:
    "Senior engineer with a track record of building reliable, scalable products for customers across web and cloud platforms.",
  titleOverride: null,
  keywords: ["React"],
  highlightedSkills: ["React"],
  experiences: [
    {
      experienceId: "exp-1",
      bullets: [
        {
          experienceId: "exp-1",
          sourceBulletIndex: 0,
          text: "Built scalable web applications.",
        },
      ],
    },
  ],
  skills: [{ category: "Frontend", items: ["React"] }],
};

const layout = {
  id: "modern-blue",
  version: 4,
  component_key: "modern-blue",
  guidelines: {},
};

const generation = {
  id: "gen-1",
  created_by: "admin-1",
  deleted_at: null,
  layout_id: layout.id,
  source_snapshot: { sourceHash: "source-hash", guidelineHash: "guideline-hash" },
};

function resumeRequest(overrides: Record<string, unknown> = {}): Request {
  return new Request("https://admin.example.com/api/resume/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "resume",
      generationId: "gen-1",
      resume,
      layoutId: layout.id,
      sourceHash: "source-hash",
      guidelineHash: "guideline-hash",
      ...overrides,
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ ok: true, id: "admin-1", email: "a@b.com" });
  mocks.getResumeGenerationById.mockResolvedValue(generation);
  mocks.getResumeLayouts.mockResolvedValue([layout]);
  mocks.getResumeLayoutById.mockResolvedValue(layout);
  mocks.getResumeData.mockResolvedValue({
    name: "Jane Doe",
    title: "Engineer",
    skills: [],
  });
  mocks.loadCandidateFacts.mockResolvedValue({ factSheet: "" });
  mocks.createRenderJob.mockImplementation(async (job: Record<string, unknown>) => ({
    ...job,
    status: "queued",
    objectKey: null,
    error: null,
    fitReport: null,
    createdAt: Date.now(),
  }));
  mocks.getRenderJobQueue.mockReturnValue(null);
  mocks.processRenderJob.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/resume/export", () => {
  it("rejects unauthenticated requests", async () => {
    mocks.requireAdmin.mockResolvedValue({ ok: false, error: "Unauthorized" });
    const res = await POST(resumeRequest());
    expect(res.status).toBe(401);
    expect(mocks.createRenderJob).not.toHaveBeenCalled();
  });

  it("404s for a generation that doesn't belong to the caller", async () => {
    mocks.getResumeGenerationById.mockResolvedValue({
      ...generation,
      created_by: "someone-else",
    });
    const res = await POST(resumeRequest());
    expect(res.status).toBe(404);
  });

  it("rejects a stale source hash", async () => {
    const res = await POST(resumeRequest({ sourceHash: "different-hash" }));
    expect(res.status).toBe(409);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe("STALE_SOURCE");
  });

  it("enqueues a resume render job and returns 202 with a jobId", async () => {
    const res = await POST(resumeRequest());
    expect(res.status).toBe(202);
    const json = (await res.json()) as { jobId: string; filename: string };
    expect(json.jobId).toBeTruthy();
    expect(json.filename).toContain("Resume");
    expect(mocks.createRenderJob).toHaveBeenCalledWith(
      expect.objectContaining({
        createdBy: "admin-1",
        generationId: "gen-1",
        kind: "resume",
        payload: { layoutId: layout.id, tailoredResume: resume },
      }),
    );
  });

  it("dispatches to SQS when a queue is configured", async () => {
    const enqueue = vi.fn().mockResolvedValue(undefined);
    mocks.getRenderJobQueue.mockReturnValue({ enqueue });
    const res = await POST(resumeRequest());
    expect(res.status).toBe(202);
    expect(enqueue).toHaveBeenCalledWith({ jobId: expect.any(String) });
    expect(mocks.processRenderJob).not.toHaveBeenCalled();
  });

  it("processes inline when no queue is configured (fixture/local dev)", async () => {
    const res = await POST(resumeRequest());
    expect(res.status).toBe(202);
    expect(mocks.processRenderJob).toHaveBeenCalledWith(expect.any(String));
  });

  it("rejects a cover letter with unsupported numeric claims", async () => {
    mocks.loadCandidateFacts.mockResolvedValue({ factSheet: "grew revenue" });
    const res = await POST(
      new Request("https://admin.example.com/api/resume/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "cover_letter",
          generationId: "gen-1",
          coverLetter: {
            greeting: "Dear Hiring Manager,",
            body: ["I increased revenue by 500% in one quarter through hard work."],
            closing: "I would welcome the opportunity to discuss further.",
            signOff: "Best regards,\nJane Doe",
          },
        }),
      }),
    );
    expect(res.status).toBe(422);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe("FACT_VALIDATION_FAILED");
  });
});
