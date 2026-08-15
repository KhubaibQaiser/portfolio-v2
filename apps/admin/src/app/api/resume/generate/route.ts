import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureAiApiKeys } from "@portfolio/ai";
import { resumeGenerationSuccessSchema } from "@portfolio/ai/schemas";
import { trimJobDescription } from "@portfolio/ai/context/trim-job-description";
import {
  stripPromptInjection,
  wrapUntrusted,
} from "@portfolio/ai/guardrails/prompt-injection";
import { getContentRepository } from "@portfolio/data";
import {
  applyTailoredResume,
  getResumeData,
  getValidatedHighlightedSkills,
} from "@portfolio/shared/resume-data";
import { describeAppliedResumeChanges } from "@portfolio/shared/resume-changes";
import { renderResumePdfBuffer } from "@portfolio/ui/resume-pdf";
import {
  pickDefaultResumeLayout,
  type VariantGuidelines,
} from "@portfolio/shared/schemas";
import { requireAdmin } from "@/lib/auth-guard";
import { logger } from "@/lib/logger";
import {
  generateValidatedContent,
  ValidatedGenerationError,
} from "@/lib/resume-ai/generate-validated-content";
import { createGenerationSnapshot } from "@/lib/resume-ai/generation-snapshot";
import { loadCandidateFactsUncached } from "@/lib/resume-ai/load-candidate-facts";
import { checkResumeAiRateLimit } from "@/lib/resume-ai/rate-limit";
import { checkCostCap } from "@/lib/resume-ai/cost-cap";

export const runtime = "nodejs";
export const maxDuration = 60;

const GENERATION_DEADLINE_MS = 52_000;

const bodySchema = z
  .object({
    kind: z.enum(["resume", "cover_letter", "both"]),
    jobDescription: z.string().min(20).max(20_000),
    jdSource: z.enum(["paste", "pdf"]).default("paste"),
    company: z.string().max(200).optional(),
    role: z.string().max(200).optional(),
    hiringManager: z.string().max(200).optional(),
    tone: z.enum(["formal", "friendly", "enthusiastic"]).optional(),
    length: z.enum(["short", "standard", "detailed"]).optional(),
    language: z.enum(["en", "de", "fr"]).default("en"),
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

  try {
    const cap = await checkCostCap(auth.id);
    if (!cap.ok) {
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
  } catch {
    return generationError(
      "PROVIDER_UNAVAILABLE",
      "Usage limits could not be verified. Try again shortly.",
      503,
    );
  }

  try {
    await ensureAiApiKeys(body.model);
  } catch (error) {
    logger.error("resume AI provider configuration unavailable", {
      userId: auth.id,
      error: error instanceof Error ? error : new Error(String(error)),
    });
    return generationError(
      "PROVIDER_UNAVAILABLE",
      "Resume AI is not configured for the selected model.",
      503,
    );
  }

  const jdText = trimJobDescription(stripPromptInjection(body.jobDescription)).trim();
  if (jdText.length < 20) {
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

  const layoutId = layout.id;
  const layoutVersion = layout.version;
  const guidelines: VariantGuidelines = layout.guidelines;
  const requestDeadline = AbortSignal.any([
    request.signal,
    AbortSignal.timeout(GENERATION_DEADLINE_MS),
  ]);

  try {
    const facts = await loadCandidateFactsUncached();
    const snapshot = createGenerationSnapshot(facts, guidelines, layoutVersion);
    const canonicalFactText = facts.factSheet.toLocaleLowerCase();
    const safeMustTryToInclude = body.mustTryToInclude?.filter((keyword) =>
      canonicalFactText.includes(keyword.trim().toLocaleLowerCase()),
    );

    logger.info("validated resume generation requested", {
      userId: auth.id,
      kind: body.kind,
      modelMode: body.model,
      layoutId,
      layoutVersion,
      jdSource: body.jdSource,
      jdLength: jdText.length,
    });

    const generated = await generateValidatedContent({
      kind: body.kind,
      modelMode: body.model,
      wrappedJobDescription: wrapUntrusted(jdText),
      facts,
      guidelines,
      signal: requestDeadline,
      company: body.company,
      role: body.role,
      hiringManager: body.hiringManager,
      tone: body.tone,
      length: body.length,
      language: body.language,
      mustTryToInclude: safeMustTryToInclude,
    });

    let appliedChanges: string[] = [];
    let fitReport: Record<string, unknown> | undefined;
    if (generated.resume) {
      const base = await getResumeData(repo);
      appliedChanges = describeAppliedResumeChanges(base, generated.resume, body.role);
      const pdfData = applyTailoredResume(base, generated.resume, {
        maxRoles: guidelines.validation.maxExperienceItems,
        maxBullets: Math.min(
          guidelines.validation.maxBulletsPerRole,
          guidelines.formatting.layout.maxBulletsPerJob,
        ),
      });
      const rendered = await renderResumePdfBuffer(pdfData, layout, {
        mode: "tailored",
        highlightedSkills: getValidatedHighlightedSkills(
          base,
          generated.resume.highlightedSkills,
        ),
      });
      if (
        rendered.fitReport &&
        rendered.fitReport.pageCount > guidelines.validation.maxPageCount
      ) {
        throw new ValidatedGenerationError(
          "INVALID_MODEL_OUTPUT",
          "The generated resume could not fit the selected layout.",
          true,
        );
      }
      fitReport = rendered.fitReport ? { ...rendered.fitReport } : undefined;
    }

    if (requestDeadline.aborted) {
      throw new ValidatedGenerationError(
        "GENERATION_TIMEOUT",
        "Generation was cancelled before it could be saved.",
        true,
      );
    }

    const persisted = await repo.insertResumeGeneration({
      created_by: auth.id,
      company: body.company ?? null,
      role: body.role ?? null,
      hiring_manager: body.hiringManager ?? null,
      language: body.language,
      tone: body.tone ?? null,
      length: body.length ?? null,
      jd_text: jdText,
      jd_source: body.jdSource,
      jd_pdf_url: null,
      model: generated.model,
      fallback_used: generated.fallbackUsed,
      resume: generated.resume as Record<string, unknown> | null,
      cover_letter: generated.coverLetter as Record<string, unknown> | null,
      ats: null,
      usage: { ...generated.usage, ...(fitReport ? { fitReport } : {}) },
      resume_pdf_url: null,
      cover_letter_pdf_url: null,
      layout_id: layoutId,
      applied_changes: appliedChanges,
      generation_version: 2,
      source_snapshot: snapshot,
      archived_at: null,
      deleted_at: null,
    });

    const response = resumeGenerationSuccessSchema.parse({
      generationId: persisted.id,
      resume: generated.resume,
      coverLetter: generated.coverLetter,
      appliedChanges,
      layout: {
        id: layoutId,
        version: layoutVersion,
        sourceHash: snapshot.sourceHash,
        guidelineHash: snapshot.guidelineHash,
      },
      metadata: {
        attempts: generated.attempts,
        warnings: generated.warnings,
        fitReport: fitReport ?? null,
      },
    });

    logger.info("validated resume generation persisted", {
      userId: auth.id,
      generationId: persisted.id,
      model: generated.model,
      attempts: generated.attempts.length,
      attemptReasons: generated.attempts.map((attempt) => attempt.reason),
      fallbackUsed: generated.fallbackUsed,
      costUsd: generated.usage.costUsd,
    });

    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ValidatedGenerationError) {
      logger.warn("validated resume generation rejected", {
        userId: auth.id,
        code: error.code,
      });
      return generationError(error.code, error.message, 422, error.retryable);
    }

    logger.error("validated resume generation failed", {
      userId: auth.id,
      error: error instanceof Error ? error : new Error(String(error)),
    });
    return generationError(
      "PERSISTENCE_FAILED",
      "The validated generation could not be saved. Nothing was returned.",
      500,
    );
  }
}
