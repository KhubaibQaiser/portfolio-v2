import { NextResponse } from "next/server";
import { z } from "zod";
import { trimJobDescription } from "@portfolio/ai/context/trim-job-description";
import { stripPromptInjection } from "@portfolio/ai/guardrails/prompt-injection";
import {
  getContentRepository,
  getGenerationJobQueue,
  getGenerationJobStore,
} from "@portfolio/data";
import { pickDefaultResumeLayout } from "@portfolio/shared/schemas";
import { requireAdmin } from "@/lib/auth-guard";
import { logger } from "@/lib/logger";
import { toError } from "@/lib/to-error";
import { checkResumeAiRateLimit } from "@/lib/resume-ai/rate-limit";
import {
  estimateGenerationReservationUsd,
  reserveAiUsage,
  type UsageReservationGuard,
} from "@/lib/resume-ai/cost-cap";
import { processGenerationJob } from "@/lib/resume-ai/process-generation-job";
import type { GenerationJobPayload } from "@/lib/resume-ai/generation-job-payload";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z
  .object({
    kind: z.enum(["resume", "cover_letter", "both"]),
    jobDescription: z.string().min(20).max(20_000),
    jdSource: z.enum(["paste", "pdf"]).default("paste"),
    company: z.string().max(200).optional(),
    role: z.string().max(200).optional(),
    hiringManager: z.string().max(200).optional(),
    model: z.enum(["quality", "fast"]).default("quality"),
    mustTryToInclude: z.array(z.string().max(80)).max(40).optional(),
    regenerateFromId: z.string().uuid().optional(),
    layoutId: z.string().min(1).optional(),
  })
  .strict();

function generationError(
  code:
    | "INVALID_MODEL_OUTPUT"
    | "OUTPUT_TRUNCATED"
    | "FACT_VALIDATION_FAILED"
    | "PROVIDER_UNAVAILABLE"
    | "GENERATION_TIMEOUT"
    | "PERSISTENCE_FAILED",
  message: string,
  status: number,
  retryable = true,
) {
  return NextResponse.json(
    { error: { code, message, retryable } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
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
      error: error instanceof Error ? error : new Error(String(error)),
    }),
  );
}

/**
 * Enqueues an async AI generation job instead of calling the model inline.
 * Validation that used to gate a synchronous generate (rate limit, cost cap,
 * JD sanitization, layout existence) still happens here; only the LLM work
 * moves to a worker off the CloudFront/Lambda-timeout path. Poll status at
 * `/api/resume/generate/status`.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: auth.error, retryable: false } },
      { status: 401 },
    );
  }

  const parsedBody = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "Check the job description and generation options.",
          retryable: false,
        },
      },
      { status: 400 },
    );
  }
  const body = parsedBody.data;

  const rate = await checkResumeAiRateLimit(auth.id);
  if (!rate.ok) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Generation rate limit reached. Try again shortly.",
          retryable: true,
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSeconds),
          "Cache-Control": "no-store",
        },
      },
    );
  }

  let reservation: Awaited<ReturnType<typeof reserveAiUsage>>;
  try {
    reservation = await reserveAiUsage(
      auth.id,
      estimateGenerationReservationUsd(body.model),
    );
  } catch {
    return generationError(
      "PROVIDER_UNAVAILABLE",
      "Usage limits could not be verified. Try again shortly.",
      503,
    );
  }
  if (!reservation.ok) {
    logger.warn("resume AI generation denied by cost cap", {
      userId: auth.id,
      spentUsd: reservation.spentUsd,
      capUsd: reservation.capUsd,
    });
    return NextResponse.json(
      {
        error: {
          code: "COST_CAP_REACHED",
          message: "The daily Resume AI cost cap has been reached.",
          retryable: false,
        },
      },
      { status: 402 },
    );
  }
  const usageGuard: UsageReservationGuard = reservation;

  const jdText = trimJobDescription(stripPromptInjection(body.jobDescription)).trim();
  if (jdText.length < 20) {
    await releaseUsageReservation(auth.id, usageGuard);
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "The job description is too short after safety cleanup.",
          retryable: false,
        },
      },
      { status: 400 },
    );
  }

  const repo = getContentRepository();
  const layouts = await repo.getResumeLayouts().catch(() => null);
  if (!layouts) {
    await releaseUsageReservation(auth.id, usageGuard);
    return generationError(
      "PERSISTENCE_FAILED",
      "Resume layouts could not be loaded. Try again shortly.",
      503,
    );
  }
  const layout = body.layoutId
    ? layouts.find((candidate) => candidate.id === body.layoutId)
    : pickDefaultResumeLayout(layouts);
  if (!layout) {
    await releaseUsageReservation(auth.id, usageGuard);
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: body.layoutId
            ? "The selected resume layout no longer exists."
            : "No default resume layout is configured.",
          retryable: false,
        },
      },
      { status: 400 },
    );
  }

  const payload: GenerationJobPayload = {
    kind: body.kind,
    jdText,
    jdSource: body.jdSource,
    layoutId: layout.id,
    layoutVersion: layout.version,
    model: body.model,
    ...(body.company ? { company: body.company } : {}),
    ...(body.role ? { role: body.role } : {}),
    ...(body.hiringManager ? { hiringManager: body.hiringManager } : {}),
    ...(body.mustTryToInclude ? { mustTryToInclude: body.mustTryToInclude } : {}),
  };

  try {
    const job = await getGenerationJobStore().create({
      jobId: crypto.randomUUID(),
      createdBy: auth.id,
      payload,
      reservationId: usageGuard.reservationId,
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

    logger.info("validated resume generation enqueued", {
      userId: auth.id,
      jobId: job.jobId,
      kind: body.kind,
      modelMode: body.model,
      layoutId: layout.id,
      layoutVersion: layout.version,
      jdSource: body.jdSource,
      jdLength: jdText.length,
    });

    return NextResponse.json(
      { jobId: job.jobId, status: "queued" as const },
      { status: 202, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    await releaseUsageReservation(auth.id, usageGuard);
    logger.error("validated resume generation enqueue failed", {
      userId: auth.id,
      error: toError(error),
    });
    return generationError(
      "PERSISTENCE_FAILED",
      "The generation job could not be started. Nothing was returned.",
      500,
    );
  }
}
