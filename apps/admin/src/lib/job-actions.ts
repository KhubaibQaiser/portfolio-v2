"use server";

import {
  getContentRepository,
  getGenerationJobQueue,
  getGenerationJobStore,
  getJobBoardRepository,
} from "@portfolio/data";
import {
  jobPreferencesSchema,
  jobStatusEnum,
  pickDefaultResumeLayout,
  type JobPreferencesFormData,
  type JobStatus,
} from "@portfolio/shared/schemas";
import { isContentConflictError } from "@portfolio/shared/concurrency";
import { requireAdmin } from "@/lib/auth-guard";
import {
  canTransition,
  followUpAtForApply,
  snoozeFollowUp,
} from "@/lib/jobs/status-machine";
import { runScheduledIngest } from "@/lib/jobs/scheduled";
import {
  formatRecruiterMessage,
  generateRecruiterMessage,
} from "@/lib/jobs/generate-recruiter-message";
import { logger } from "@/lib/logger";
import { toError } from "@/lib/to-error";
import { checkResumeAiRateLimit } from "@/lib/resume-ai/rate-limit";
import {
  estimateGenerationReservationUsd,
  reserveAiUsage,
  type UsageReservationGuard,
} from "@/lib/resume-ai/cost-cap";
import { processGenerationJob } from "@/lib/resume-ai/process-generation-job";
import { trimJobDescription } from "@portfolio/ai/context/trim-job-description";
import { stripPromptInjection } from "@portfolio/ai/guardrails/prompt-injection";
import type { GenerationJobPayload } from "@/lib/resume-ai/generation-job-payload";

export type ActionResult =
  | { success: true; generationJobId?: string }
  | { success: false; error: string };

function actionError(error: unknown): ActionResult {
  if (isContentConflictError(error)) {
    return {
      success: false,
      error: "This content changed in another session. Refresh and re-apply your edit.",
    };
  }
  return {
    success: false,
    error: error instanceof Error ? error.message : "Unknown error",
  };
}

export async function saveJobPreferences(
  values: JobPreferencesFormData,
  expectedRevision?: number,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  const parsed = jobPreferencesSchema.safeParse(values);
  if (!parsed.success) return { success: false, error: parsed.error.message };
  try {
    await getContentRepository().upsertJobPreferences(parsed.data, expectedRevision);
    return { success: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function runIngestNow(): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  try {
    await runScheduledIngest();
    return { success: true };
  } catch (error) {
    logger.error("manual job ingest failed", { error: toError(error) });
    return actionError(error);
  }
}

export async function setJobStatus(id: string, status: JobStatus): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  const parsedStatus = jobStatusEnum.safeParse(status);
  if (!parsedStatus.success) return { success: false, error: "Invalid status" };
  const jobs = getJobBoardRepository();
  const current = await jobs.getById(id);
  if (!current) return { success: false, error: "Job not found" };
  if (!canTransition(current.status, parsedStatus.data)) {
    return {
      success: false,
      error: `Cannot move from ${current.status} to ${parsedStatus.data}`,
    };
  }
  const patch: Partial<typeof current> = { status: parsedStatus.data };
  if (parsedStatus.data === "applied") {
    patch.follow_up_at = followUpAtForApply();
  }
  if (parsedStatus.data === "discarded" || parsedStatus.data === "closed") {
    patch.follow_up_at = null;
  }
  await jobs.update(id, patch);
  return { success: true };
}

export async function snoozeJob(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  const jobs = getJobBoardRepository();
  const current = await jobs.getById(id);
  if (!current) return { success: false, error: "Job not found" };
  if (!canTransition(current.status, "snoozed") && current.status !== "snoozed") {
    return { success: false, error: `Cannot snooze from ${current.status}` };
  }
  await jobs.update(id, {
    status: "snoozed",
    follow_up_at: snoozeFollowUp(current.follow_up_at),
    snooze_count: current.snooze_count + 1,
  });
  return { success: true };
}

async function releaseUsageReservation(
  userId: string,
  usageGuard: UsageReservationGuard,
): Promise<void> {
  await usageGuard.reservation.release(userId, usageGuard.reservationId).catch((error) =>
    logger.warn("resume AI usage reservation cleanup failed", {
      userId,
      reservationId: usageGuard.reservationId,
      reservedUsd: usageGuard.reservedUsd,
      error: toError(error),
    }),
  );
}

export async function tailorJob(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  const jobs = getJobBoardRepository();
  const posting = await jobs.getById(id);
  if (!posting) return { success: false, error: "Job not found" };

  const rate = await checkResumeAiRateLimit(auth.id);
  if (!rate.ok) return { success: false, error: "Generation rate limit reached." };

  let reservation: Awaited<ReturnType<typeof reserveAiUsage>>;
  try {
    reservation = await reserveAiUsage(auth.id, estimateGenerationReservationUsd("fast"));
  } catch {
    return { success: false, error: "Usage limits could not be verified." };
  }
  if (!reservation.ok) {
    return { success: false, error: "The daily Resume AI cost cap has been reached." };
  }

  const jdText = trimJobDescription(stripPromptInjection(posting.jd_text)).trim();
  if (jdText.length < 20) {
    await releaseUsageReservation(auth.id, reservation);
    return {
      success: false,
      error: "Job description is too short after safety cleanup.",
    };
  }

  const repo = getContentRepository();
  const [layouts, prefs] = await Promise.all([
    repo.getResumeLayouts().catch(() => []),
    repo.getJobPreferences(),
  ]);
  const layout = prefs.default_layout_id
    ? layouts.find((candidate) => candidate.id === prefs.default_layout_id)
    : pickDefaultResumeLayout(layouts);
  if (!layout) {
    await releaseUsageReservation(auth.id, reservation);
    return { success: false, error: "No default resume layout is configured." };
  }

  const payload: GenerationJobPayload = {
    kind: "both",
    jdText,
    jdSource: "paste",
    layoutId: layout.id,
    layoutVersion: layout.version,
    model: "fast",
    company: posting.company,
    role: posting.title,
  };

  try {
    const job = await getGenerationJobStore().create({
      jobId: crypto.randomUUID(),
      createdBy: auth.id,
      payload,
      reservationId: reservation.reservationId,
    });
    const queue = getGenerationJobQueue();
    if (queue) {
      await queue.enqueue({ jobId: job.jobId });
    } else {
      void processGenerationJob(job.jobId).catch((error: unknown) => {
        logger.error("inline generation-job processing failed", {
          jobId: job.jobId,
          error: toError(error),
        });
      });
    }
    await jobs.update(id, {
      generation_id: job.jobId,
      status: posting.status === "new" ? "reviewing" : posting.status,
    });
    return { success: true, generationJobId: job.jobId };
  } catch (error) {
    await releaseUsageReservation(auth.id, reservation);
    return actionError(error);
  }
}

export async function draftRecruiterMessage(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  const jobs = getJobBoardRepository();
  const posting = await jobs.getById(id);
  if (!posting) return { success: false, error: "Job not found" };
  try {
    const message = await generateRecruiterMessage({
      jdText: posting.jd_text,
      company: posting.company,
      role: posting.title,
    });
    await jobs.update(id, { recruiter_message: formatRecruiterMessage(message) });
    return { success: true };
  } catch (error) {
    logger.error("recruiter message generation failed", {
      jobId: id,
      error: toError(error),
    });
    return actionError(error);
  }
}
