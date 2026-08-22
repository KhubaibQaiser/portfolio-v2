import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRenderJobStore: vi.fn(),
  getResumeData: vi.fn(),
  getResumeLayoutById: vi.fn(),
  rendererRender: vi.fn(),
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
vi.mock("@portfolio/shared/ports", () => ({
  getResumePdfRenderer: vi.fn(() => ({
    supports: () => true,
    render: mocks.rendererRender,
  })),
}));
vi.mock("./register-resume-renderers", () => ({
  registerResumeRenderers: vi.fn(),
}));
vi.mock("@portfolio/ui/resume-pdf", () => ({
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
  component_key: "modern-blue" as const,
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
    mocks.getResumeData.mockResolvedValue({
      name: "Jane Doe",
      skills: [],
      experience: [],
    });
    mocks.getResumeLayoutById.mockResolvedValue(layout);
    mocks.rendererRender.mockResolvedValue({
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

  it("renders resume via renderer registry and uploads PDF", async () => {
    store.get.mockResolvedValue(makeJob());
    await processRenderJob("job-1");
    expect(store.markRendering).toHaveBeenCalledWith("job-1");
    expect(mocks.rendererRender).toHaveBeenCalled();
    expect(mocks.uploadObject).toHaveBeenCalled();
    expect(store.markReady).toHaveBeenCalledWith(
      "job-1",
      "render-jobs/job-1.pdf",
      expect.objectContaining({ pageCount: 1 }),
    );
  });

  it("marks job failed when rendering throws", async () => {
    store.get.mockResolvedValue(makeJob());
    mocks.rendererRender.mockRejectedValue(new Error("render failed"));
    await expect(processRenderJob("job-1")).rejects.toThrow("render failed");
    expect(store.markFailed).toHaveBeenCalled();
  });
});

describe("safeFileName", () => {
  it("joins sanitized parts", () => {
    expect(safeFileName(["Jane Doe", "Engineer", "Resume"])).toBe(
      "Jane-Doe-Engineer-Resume",
    );
  });
});
