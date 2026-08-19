import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRenderJobStore: vi.fn(),
  getResumeData: vi.fn(),
  getResumeLayoutById: vi.fn(),
  renderResumePdfBuffer: vi.fn(),
  uploadObject: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@portfolio/data", () => ({
  getContentRepository: () => ({ getResumeLayoutById: mocks.getResumeLayoutById }),
  getRenderJobStore: mocks.getRenderJobStore,
}));
vi.mock("@portfolio/data/media", () => ({
  getMediaStore: async () => ({ uploadObject: mocks.uploadObject }),
}));
vi.mock("@portfolio/shared/resume-data", () => ({
  getResumeData: mocks.getResumeData,
  applyTailoredResume: (base: unknown, tailored: unknown) => ({
    ...(base as object),
    tailored,
  }),
}));
vi.mock("@portfolio/ui/resume-pdf", () => ({
  renderResumePdfBuffer: mocks.renderResumePdfBuffer,
  CoverLetterDocument: () => null,
}));
vi.mock("@react-pdf/renderer", () => ({
  renderToBuffer: vi.fn(async () => Buffer.from("cover-letter-pdf")),
}));
vi.mock("../logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: mocks.loggerError },
}));

import { processRenderJob, safeFileName } from "./process-render-job";

const layout = {
  id: "modern-blue",
  guidelines: {
    validation: { maxExperienceItems: 5, maxBulletsPerRole: 4 },
    formatting: { layout: { maxBulletsPerJob: 4 } },
    contentEmphasis: { skillsStrategy: { highlightRequired: true } },
  },
};

const tailoredResume = {
  summary: "x".repeat(80),
  titleOverride: null,
  keywords: [],
  highlightedSkills: ["React"],
  experiences: [
    {
      experienceId: "e1",
      bullets: [
        {
          experienceId: "e1",
          sourceBulletIndex: 0,
          text: "Did a thing that mattered a lot.",
        },
      ],
    },
  ],
  skills: [{ category: "Frontend", items: ["React"] }],
};

function makeJob(overrides: Record<string, unknown> = {}) {
  return {
    jobId: "job-1",
    createdBy: "admin-1",
    generationId: "gen-1",
    kind: "resume" as const,
    payload: { layoutId: layout.id, tailoredResume },
    filename: "Resume.pdf",
    status: "queued" as const,
    objectKey: null,
    error: null,
    fitReport: null,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("processRenderJob", () => {
  let store: {
    get: ReturnType<typeof vi.fn>;
    markRendering: ReturnType<typeof vi.fn>;
    markReady: ReturnType<typeof vi.fn>;
    markFailed: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    store = {
      get: vi.fn(),
      markRendering: vi.fn().mockResolvedValue(undefined),
      markReady: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined),
    };
    mocks.getRenderJobStore.mockReturnValue(store);
    mocks.getResumeData.mockResolvedValue({ name: "Jane Doe", skills: [] });
    mocks.getResumeLayoutById.mockResolvedValue(layout);
    mocks.renderResumePdfBuffer.mockResolvedValue({
      buffer: Buffer.from("pdf-bytes"),
      fitReport: { pageCount: 1, degraded: false },
    });
    mocks.uploadObject.mockResolvedValue(undefined);
  });

  it("is a no-op for a job that no longer exists", async () => {
    store.get.mockResolvedValue(null);
    await processRenderJob("missing");
    expect(store.markRendering).not.toHaveBeenCalled();
  });

  it("is a no-op for a job already in a terminal state", async () => {
    store.get.mockResolvedValue(makeJob({ status: "ready" }));
    await processRenderJob("job-1");
    expect(store.markRendering).not.toHaveBeenCalled();
  });

  it("renders a resume job, uploads it, and marks it ready", async () => {
    store.get.mockResolvedValue(makeJob());
    await processRenderJob("job-1");

    expect(store.markRendering).toHaveBeenCalledWith("job-1");
    expect(mocks.uploadObject).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      "render-jobs/job-1.pdf",
      "application/pdf",
    );
    expect(store.markReady).toHaveBeenCalledWith("job-1", "render-jobs/job-1.pdf", {
      pageCount: 1,
      degraded: false,
    });
  });

  it("renders a cover letter job without needing a layout", async () => {
    store.get.mockResolvedValue(
      makeJob({
        kind: "cover_letter",
        payload: {
          letter: {
            greeting: "Dear Hiring Manager,",
            body: [
              "A sufficiently long paragraph about my qualifications for this role.",
            ],
            closing: "I look forward to hearing from you soon.",
            signOff: "Best regards,\nJane Doe",
          },
          meta: { company: "Acme" },
        },
      }),
    );
    await processRenderJob("job-1");
    expect(store.markReady).toHaveBeenCalledWith("job-1", "render-jobs/job-1.pdf", null);
  });

  it("marks the job failed and rethrows when rendering throws", async () => {
    store.get.mockResolvedValue(makeJob());
    mocks.renderResumePdfBuffer.mockRejectedValue(new Error("boom"));

    await expect(processRenderJob("job-1")).rejects.toThrow("boom");
    expect(store.markFailed).toHaveBeenCalledWith(
      "job-1",
      "Rendering failed. Please try again.",
    );
  });

  it("throws when the payload references a layout that no longer exists", async () => {
    mocks.getResumeLayoutById.mockResolvedValue(null);
    store.get.mockResolvedValue(makeJob());
    await expect(processRenderJob("job-1")).rejects.toThrow("no longer exists");
    expect(store.markFailed).toHaveBeenCalled();
  });
});

describe("safeFileName", () => {
  it("joins non-empty parts with hyphens, stripping unsafe characters", () => {
    expect(safeFileName(["Jane Doe", undefined, "Résumé!"])).toBe("Jane-Doe-R-sum");
  });
});
