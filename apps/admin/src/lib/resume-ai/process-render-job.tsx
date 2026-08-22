import { getResumePdfRenderer } from "@portfolio/shared/ports";
import { applyTailoredResume, getResumeData } from "@portfolio/shared/resume-data";
import type { RenderJob } from "@portfolio/shared/ports";
import { getContentRepository, getRenderJobStore } from "@portfolio/data";
import { renderToBuffer } from "@react-pdf/renderer";
import { CoverLetterDocument } from "@portfolio/ui/resume-pdf";
import { logger } from "../logger";
import { toError } from "../to-error";
import {
  coverLetterRenderJobPayloadSchema,
  resumeRenderJobPayloadSchema,
} from "./render-job-payload";
import { registerResumeRenderers } from "./register-resume-renderers";

registerResumeRenderers();

const WORKER_RENDER_DEADLINE_MS = 4 * 60_000;

export function safeFileName(parts: (string | undefined)[]): string {
  return parts
    .filter((p): p is string => Boolean(p && p.trim().length > 0))
    .map((p) => p.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, ""))
    .filter(Boolean)
    .join("-");
}

async function renderJobToPdf(
  job: RenderJob,
): Promise<{ buffer: Buffer; fitReport: Record<string, unknown> | null }> {
  const repo = getContentRepository();

  if (job.kind === "resume") {
    const payload = resumeRenderJobPayloadSchema.parse(job.payload);
    const [base, layout] = await Promise.all([
      getResumeData(repo),
      repo.getResumeLayoutById(payload.layoutId),
    ]);
    if (!layout) throw new Error(`Layout ${payload.layoutId} no longer exists`);

    const maxRoles =
      layout.component_key === "ats-resume"
        ? base.experience.length
        : layout.guidelines.validation.maxExperienceItems;

    const data = applyTailoredResume(base, payload.tailoredResume, {
      maxRoles,
      maxBullets: Math.min(
        layout.guidelines.validation.maxBulletsPerRole,
        layout.guidelines.formatting.layout.maxBulletsPerJob,
      ),
    });

    const highlightedSkills = layout.guidelines.contentEmphasis.skillsStrategy
      .highlightRequired
      ? payload.tailoredResume.highlightedSkills
      : [];

    const renderer = getResumePdfRenderer(layout.component_key);
    const { buffer, fitReport } = await renderer.render({
      data,
      layout,
      mode: "tailored",
      highlightedSkills,
      deadlineAt: Date.now() + WORKER_RENDER_DEADLINE_MS,
    });

    return { buffer: Buffer.from(buffer), fitReport };
  }

  const payload = coverLetterRenderJobPayloadSchema.parse(job.payload);
  const base = await getResumeData(repo);
  const buffer = await renderToBuffer(
    <CoverLetterDocument contact={base} letter={payload.letter} meta={payload.meta} />,
  );
  return { buffer, fitReport: null };
}

/**
 * Renders one async PDF render job end to end: fetch -> render -> upload ->
 * mark ready/failed. Used by both the SQS-triggered worker Lambda in
 * production and, inline, by the enqueue route in fixture/local dev (where
 * there's no real queue/worker running).
 */
export async function processRenderJob(jobId: string): Promise<void> {
  const renderJobStore = getRenderJobStore();
  const job = await renderJobStore.get(jobId);
  if (!job) {
    logger.warn("render job not found (expired or already deleted)", { jobId });
    return;
  }
  if (job.status === "ready" || job.status === "failed") {
    return;
  }

  await renderJobStore.markRendering(jobId);
  try {
    const { buffer, fitReport } = await renderJobToPdf(job);
    const { getMediaStore } = await import("@portfolio/data/media");
    const mediaStore = await getMediaStore();
    const objectKey = `render-jobs/${jobId}.pdf`;
    await mediaStore.uploadObject(new Uint8Array(buffer), objectKey, "application/pdf");
    await renderJobStore.markReady(jobId, objectKey, fitReport);
    if (fitReport && "degraded" in fitReport && fitReport.degraded) {
      logger.error("render job completed degraded (did not fit one page)", {
        jobId,
        kind: job.kind,
        fitReport,
      });
    } else {
      logger.info("render job completed", { jobId, kind: job.kind, fitReport });
    }
  } catch (error) {
    await renderJobStore
      .markFailed(jobId, "Rendering failed. Please try again.")
      .catch(() => {});
    logger.error("render job processing failed", {
      jobId,
      kind: job.kind,
      error: toError(error),
    });
    throw error;
  }
}
