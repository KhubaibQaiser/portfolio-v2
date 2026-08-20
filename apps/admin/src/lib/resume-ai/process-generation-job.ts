import { ensureAiApiKeys } from "@portfolio/ai";
import { resumeGenerationSuccessSchema } from "@portfolio/ai/schemas";
import { wrapUntrusted } from "@portfolio/ai/guardrails/prompt-injection";
import {
  getContentRepository,
  getGenerationJobStore,
  getUsageReservation,
} from "@portfolio/data";
import { getResumeData } from "@portfolio/shared/resume-data";
import { describeAppliedResumeChanges } from "@portfolio/shared/resume-changes";
import type { GenerationJobError } from "@portfolio/shared/ports";
import { logger } from "../logger";
import { toError } from "../to-error";
import {
  generateValidatedContent,
  ValidatedGenerationError,
} from "./generate-validated-content";
import { createGenerationSnapshot } from "./generation-snapshot";
import { generationJobPayloadSchema } from "./generation-job-payload";
import { loadCandidateFactsUncached } from "./load-candidate-facts";

/**
 * The worker runs off any CloudFront/HTTP request path (SQS-triggered), so it
 * can afford a much larger budget than the old inline synchronous generate.
 */
const WORKER_GENERATION_DEADLINE_MS = 4 * 60_000;
const PERSIST_BUFFER_MS = 4_000;

async function releaseReservation(
  userId: string,
  reservationId: string,
  actualUsd?: number,
): Promise<void> {
  const reservation = getUsageReservation();
  const operation =
    actualUsd === undefined
      ? reservation.release(userId, reservationId)
      : reservation.settle(userId, reservationId, actualUsd);

  await operation.catch((error) =>
    logger.warn("resume AI usage reservation cleanup failed", {
      userId,
      reservationId,
      actualUsd,
      error: toError(error),
    }),
  );
}

function failedError(
  code: GenerationJobError["code"],
  message: string,
  retryable: boolean,
): GenerationJobError {
  return { code, message, retryable };
}

/**
 * Runs one async AI generation job end to end: fetch -> generate -> persist ->
 * mark ready/failed. Used by both the SQS-triggered worker Lambda in
 * production and, inline, by the enqueue route in fixture/local dev.
 */
export async function processGenerationJob(jobId: string): Promise<void> {
  const store = getGenerationJobStore();
  const job = await store.get(jobId);
  if (!job) {
    logger.warn("generation job not found (expired or already deleted)", { jobId });
    return;
  }
  if (job.status === "ready" || job.status === "failed") {
    return;
  }

  await store.markRunning(jobId);

  let incurredUsageUsd: number | undefined;
  try {
    const payload = generationJobPayloadSchema.parse(job.payload);
    await ensureAiApiKeys(payload.model);

    const repo = getContentRepository();
    const [facts, layout, base] = await Promise.all([
      loadCandidateFactsUncached(),
      repo.getResumeLayoutById(payload.layoutId),
      payload.kind === "resume" || payload.kind === "both"
        ? getResumeData(repo)
        : Promise.resolve(null),
    ]);
    if (!layout) {
      throw new Error(`Layout ${payload.layoutId} no longer exists`);
    }

    const snapshot = createGenerationSnapshot(facts, layout.guidelines, layout.version);
    const canonicalFactText = facts.factSheet.toLocaleLowerCase();
    const safeMustTryToInclude = payload.mustTryToInclude?.filter((keyword) =>
      canonicalFactText.includes(keyword.trim().toLocaleLowerCase()),
    );

    const generationStartedAt = Date.now();
    const requestDeadline = AbortSignal.timeout(WORKER_GENERATION_DEADLINE_MS);
    logger.info("validated resume generation requested", {
      userId: job.createdBy,
      jobId,
      kind: payload.kind,
      modelMode: payload.model,
      layoutId: layout.id,
      layoutVersion: layout.version,
      jdSource: payload.jdSource,
      jdLength: payload.jdText.length,
    });

    const generated = await generateValidatedContent({
      kind: payload.kind,
      modelMode: payload.model,
      wrappedJobDescription: wrapUntrusted(payload.jdText),
      facts,
      guidelines: layout.guidelines,
      signal: requestDeadline,
      deadlineAt: generationStartedAt + WORKER_GENERATION_DEADLINE_MS - PERSIST_BUFFER_MS,
      company: payload.company,
      role: payload.role,
      hiringManager: payload.hiringManager,
      mustTryToInclude: safeMustTryToInclude,
    });
    incurredUsageUsd = generated.usage.costUsd ?? 0;

    let appliedChanges: string[] = [];
    if (generated.resume) {
      if (!base) {
        throw new Error("Base resume was not loaded for a resume generation.");
      }
      appliedChanges = describeAppliedResumeChanges(base, generated.resume, payload.role);
    }

    if (requestDeadline.aborted) {
      throw new ValidatedGenerationError(
        "GENERATION_TIMEOUT",
        "Generation was cancelled before it could be saved.",
        true,
      );
    }

    const persisted = await repo.insertResumeGeneration({
      created_by: job.createdBy,
      company: payload.company ?? null,
      role: payload.role ?? null,
      hiring_manager: payload.hiringManager ?? null,
      language: "en",
      tone: null,
      length: null,
      jd_text: payload.jdText,
      jd_source: payload.jdSource,
      jd_pdf_url: null,
      model: generated.model,
      fallback_used: generated.fallbackUsed,
      resume: generated.resume as Record<string, unknown> | null,
      cover_letter: generated.coverLetter as Record<string, unknown> | null,
      ats: null,
      usage: generated.usage,
      resume_pdf_url: null,
      cover_letter_pdf_url: null,
      layout_id: layout.id,
      applied_changes: appliedChanges,
      generation_version: 2,
      source_snapshot: snapshot,
      archived_at: null,
      deleted_at: null,
    });

    const result = resumeGenerationSuccessSchema.parse({
      generationId: persisted.id,
      resume: generated.resume,
      coverLetter: generated.coverLetter,
      appliedChanges,
      layout: {
        id: layout.id,
        version: layout.version,
        sourceHash: snapshot.sourceHash,
        guidelineHash: snapshot.guidelineHash,
      },
      metadata: {
        attempts: generated.attempts,
        warnings: generated.warnings,
        fitReport: null,
      },
    });

    await store.markReady(jobId, persisted.id, result);
    await releaseReservation(job.createdBy, job.reservationId, incurredUsageUsd);

    logger.info("validated resume generation persisted", {
      userId: job.createdBy,
      jobId,
      generationId: persisted.id,
      model: generated.model,
      attempts: generated.attempts.length,
      attemptReasons: generated.attempts.map((attempt) => attempt.reason),
      fallbackUsed: generated.fallbackUsed,
      costUsd: generated.usage.costUsd,
    });
  } catch (error) {
    await releaseReservation(job.createdBy, job.reservationId, incurredUsageUsd);

    if (error instanceof ValidatedGenerationError) {
      logger.warn("validated resume generation rejected", {
        userId: job.createdBy,
        jobId,
        code: error.code,
        retryable: error.retryable,
        attemptDiagnostics: error.diagnostics,
      });
      await store.markFailed(
        jobId,
        failedError(error.code, error.message, error.retryable),
      );
      return;
    }

    logger.error("generation job processing failed", {
      jobId,
      error: toError(error),
    });
    await store
      .markFailed(
        jobId,
        failedError(
          "PERSISTENCE_FAILED",
          "The validated generation could not be saved. Nothing was returned.",
          true,
        ),
      )
      .catch(() => {});
    throw error;
  }
}
