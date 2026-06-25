import { NextResponse } from "next/server";
import { generateObject, streamObject } from "ai";
import { z } from "zod";
import {
  fallbackChainFor,
  formatUsage,
  isProviderRateLimitError,
  modelFor,
  type ModelId,
  type ResolvedModel,
} from "@portfolio/ai";
import {
  combinedSchema,
  tailoredResumeSchema,
  coverLetterSchema,
  type CombinedGeneration,
  type TailoredResume,
  type CoverLetter,
} from "@portfolio/ai/schemas";
import { trimJobDescription } from "@portfolio/ai/context/trim-job-description";
import {
  stripPromptInjection,
  wrapUntrusted,
} from "@portfolio/ai/guardrails/prompt-injection";
import { sanitizeLlmObject } from "@portfolio/ai/guardrails/output-sanitize";
import { collectTextForToneCheck, scoreAiTone } from "@portfolio/ai/guardrails/ai-tone";
import { validateFabrication } from "@portfolio/ai/guardrails/fabrication-check";
import {
  buildResumeSystemPrompt,
  buildResumeUserPrompt,
} from "@portfolio/ai/prompts/resume";
import {
  buildCoverLetterSystemPrompt,
  buildCoverLetterUserPrompt,
} from "@portfolio/ai/prompts/cover-letter";
import type { CandidateFacts } from "@portfolio/ai/context/build-candidate-facts";
import { getContentRepository } from "@portfolio/data";
import type { ResumeGenerationUsage } from "@portfolio/shared/schemas";
import { requireAdmin } from "@/lib/auth-guard";
import { logger } from "@/lib/logger";
import { loadCandidateFacts } from "@/lib/resume-ai/load-candidate-facts";
import { checkResumeAiRateLimit } from "@/lib/resume-ai/rate-limit";
import { checkCostCap } from "@/lib/resume-ai/cost-cap";

export const runtime = "nodejs";
export const maxDuration = 60;

const AI_TONE_THRESHOLD = 35;

const bodySchema = z.object({
  kind: z.enum(["resume", "cover_letter", "both"]),
  jobDescription: z.string().min(20).max(20_000),
  jdSource: z.enum(["paste", "pdf"]).default("paste"),
  company: z.string().max(200).optional(),
  role: z.string().max(200).optional(),
  hiringManager: z.string().max(200).optional(),
  tone: z.enum(["formal", "friendly", "enthusiastic"]).optional(),
  length: z.enum(["short", "standard", "detailed"]).optional(),
  language: z.enum(["en", "de", "fr"]).optional(),
  model: z.enum(["quality", "fast"]).default("quality"),
  mustTryToInclude: z.array(z.string().max(80)).max(40).optional(),
  regenerateFromId: z.string().uuid().optional(),
});

type Body = z.infer<typeof bodySchema>;

function schemaFor(kind: Body["kind"]) {
  if (kind === "both") return combinedSchema;
  if (kind === "resume") return tailoredResumeSchema;
  return coverLetterSchema;
}

function extractResumeAndCoverLetter(
  kind: Body["kind"],
  object: unknown,
): { resume: TailoredResume | null; coverLetter: CoverLetter | null } {
  if (kind === "both") {
    const obj = object as CombinedGeneration;
    return { resume: obj.resume, coverLetter: obj.coverLetter };
  }
  if (kind === "resume") {
    return { resume: object as TailoredResume, coverLetter: null };
  }
  return { resume: null, coverLetter: object as CoverLetter };
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body: Body;
  try {
    const json = await request.json();
    body = bodySchema.parse(json);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const rate = await checkResumeAiRateLimit(auth.id);
  if (!rate.ok) {
    return NextResponse.json(
      {
        error: "Generation rate limit reached. Try again shortly or adjust the limit.",
        retryAfterSeconds: rate.retryAfterSeconds,
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  let cap: Awaited<ReturnType<typeof checkCostCap>>;
  try {
    cap = await checkCostCap(auth.id);
  } catch {
    return NextResponse.json(
      { error: "Unable to verify usage limits right now. Please try again shortly." },
      { status: 503 },
    );
  }
  if (!cap.ok) {
    return NextResponse.json(
      {
        error: `Daily cost cap reached ($${cap.spentUsd.toFixed(2)} / $${cap.capUsd.toFixed(2)}). Try again tomorrow or raise RESUME_GEN_DAILY_USD_CAP.`,
      },
      { status: 402 },
    );
  }

  const jdTrimmed = trimJobDescription(stripPromptInjection(body.jobDescription));
  if (jdTrimmed.length < 20) {
    return NextResponse.json(
      { error: "Job description too short after cleanup" },
      { status: 400 },
    );
  }
  const wrappedJd = wrapUntrusted(jdTrimmed);

  let facts: CandidateFacts;
  try {
    facts = await loadCandidateFacts();
  } catch {
    return NextResponse.json(
      { error: "Failed to load candidate profile. Fill in your resume data first." },
      { status: 500 },
    );
  }

  const schema = schemaFor(body.kind);

  function buildSystem(retryReason?: string): string {
    if (body.kind === "cover_letter") {
      return buildCoverLetterSystemPrompt(facts, {
        tone: body.tone,
        length: body.length,
        language: body.language,
        company: body.company,
        role: body.role,
        hiringManager: body.hiringManager,
        retryReason,
      });
    }

    const resumePrompt = buildResumeSystemPrompt(facts, {
      tone: body.tone,
      length: body.length,
      language: body.language,
      company: body.company,
      role: body.role,
      mustTryToInclude: body.mustTryToInclude,
      retryReason,
    });

    if (body.kind === "resume") return resumePrompt;

    const coverPrompt = buildCoverLetterSystemPrompt(facts, {
      tone: body.tone,
      length: body.length,
      language: body.language,
      company: body.company,
      role: body.role,
      hiringManager: body.hiringManager,
      retryReason,
    });
    return `${resumePrompt}\n\n---\n\nAlso generate the cover letter. Follow these additional rules:\n\n${coverPrompt}`;
  }

  const userPrompt =
    body.kind === "cover_letter"
      ? buildCoverLetterUserPrompt(wrappedJd)
      : buildResumeUserPrompt(wrappedJd);

  const startedAt = Date.now();
  const primary = modelFor(body.model);
  const fallbacks = fallbackChainFor(body.model);

  logger.info("resume generation requested", {
    userId: auth.id,
    kind: body.kind,
    modelMode: body.model,
    model: primary.modelId,
    jdSource: body.jdSource,
    jdLength: jdTrimmed.length,
    hasCompany: Boolean(body.company),
    hasRole: Boolean(body.role),
  });

  async function runStream(resolved: ResolvedModel, system: string, signal: AbortSignal) {
    return streamObject({
      model: resolved.model,
      schema,
      system,
      prompt: userPrompt,
      abortSignal: signal,
      temperature: 0.4,
      maxOutputTokens: 3000,
    });
  }

  let chosen = primary;
  let fallbackUsed = false;
  let result: Awaited<ReturnType<typeof runStream>>;
  try {
    result = await runStream(primary, buildSystem(), request.signal);
  } catch (err) {
    if (isProviderRateLimitError(err) && fallbacks.length > 0) {
      const fb = fallbacks[0]!;
      chosen = fb;
      fallbackUsed = true;
      logger.warn("primary model rate-limited, falling back", {
        userId: auth.id,
        primary: primary.modelId,
        fallback: fb.modelId,
      });
      result = await runStream(fb, buildSystem(), request.signal);
    } else {
      logger.error("resume generation failed to start", {
        userId: auth.id,
        model: primary.modelId,
        kind: body.kind,
        error: err instanceof Error ? err : new Error(String(err)),
      });
      const message = err instanceof Error ? err.message : "Generator failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  logger.info("resume generation streaming", {
    userId: auth.id,
    model: chosen.modelId,
    fallbackUsed,
  });

  // `onFinish` via Response callback: rather than using the streamObject
  // onFinish option (not strongly typed across AI SDK versions), we attach
  // a post-processing task that consumes the final `.object` and `.usage`
  // promises exposed on the result, independent of the response stream.
  void (async () => {
    try {
      const [object, usage] = await Promise.all([result.object, result.usage]);
      const sanitized = sanitizeLlmObject(object);
      const { resume: tailoredResume, coverLetter } = extractResumeAndCoverLetter(
        body.kind,
        sanitized,
      );

      // Fabrication + tone checks (best-effort; we persist regardless so the
      // admin can still see and edit the output).
      let aiToneScore: number | null = null;
      let toneHits: string[] = [];
      if (tailoredResume) {
        const res = validateFabrication(tailoredResume, facts.idMap);
        if (!res.ok) {
          logger.warn("resume fabrication warnings", {
            userId: auth.id,
            offending: res.offending,
          });
        }
      }
      if (tailoredResume || coverLetter) {
        const tone = scoreAiTone(collectTextForToneCheck(tailoredResume ?? coverLetter));
        aiToneScore = tone.score;
        toneHits = tone.hits;
      }

      const modelId: ModelId = chosen.modelId;
      const latencyMs = Date.now() - startedAt;
      const usageRecord = formatUsage(usage, modelId, {
        latencyMs,
        fallbackUsed,
      });

      // Silent tone retry (max 1). If the streamed output sounds robotic,
      // regenerate once with the cheap model + explicit retry reason, and
      // persist that polished version as the authoritative row content.
      let finalResume = tailoredResume;
      let finalCover = coverLetter;
      let retryApplied = false;
      let retryUsage: ReturnType<typeof formatUsage> | null = null;
      let retryToneScore: number | null = null;
      if (aiToneScore !== null && aiToneScore >= AI_TONE_THRESHOLD) {
        try {
          const retryReason = `Previous draft sounded robotic/AI-generated. Tells detected: ${
            toneHits.slice(0, 8).join(", ") || "generic corporate phrasing"
          }. Rewrite in a more human, conversational, concrete voice. Do NOT change factual content.`;
          const cheap = modelFor("cheap");
          const retryStartedAt = Date.now();
          const retryResult = await generateObject({
            model: cheap.model,
            schema,
            system: buildSystem(retryReason),
            prompt: userPrompt,
            temperature: 0.5,
            maxOutputTokens: 3000,
          });
          const retrySanitized = sanitizeLlmObject(retryResult.object);
          const retryExtracted = extractResumeAndCoverLetter(body.kind, retrySanitized);
          finalResume = retryExtracted.resume;
          finalCover = retryExtracted.coverLetter;
          retryApplied = true;
          retryUsage = formatUsage(retryResult.usage, cheap.modelId, {
            latencyMs: Date.now() - retryStartedAt,
            fallbackUsed: false,
          });
          const retryTone = scoreAiTone(
            collectTextForToneCheck(finalResume ?? finalCover),
          );
          retryToneScore = retryTone.score;
        } catch (err) {
          logger.warn("resume tone retry failed", {
            userId: auth.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      await getContentRepository().insertResumeGeneration({
        created_by: auth.id,
        company: body.company ?? null,
        role: body.role ?? null,
        hiring_manager: body.hiringManager ?? null,
        language: body.language ?? "en",
        tone: body.tone ?? null,
        length: body.length ?? null,
        jd_text: jdTrimmed,
        jd_source: body.jdSource,
        jd_pdf_url: null,
        model: modelId,
        fallback_used: fallbackUsed,
        resume: (finalResume as unknown as Record<string, unknown>) ?? null,
        cover_letter: (finalCover as unknown as Record<string, unknown>) ?? null,
        ats: null,
        usage: {
          ...usageRecord,
          aiToneScore,
          toneHits,
          threshold: AI_TONE_THRESHOLD,
          retryApplied,
          retryUsage,
          retryToneScore,
          regenerateFromId: body.regenerateFromId ?? null,
        } as unknown as ResumeGenerationUsage,
        resume_pdf_url: null,
        cover_letter_pdf_url: null,
        archived_at: null,
        deleted_at: null,
      });

      logger.info("resume generation persisted", {
        userId: auth.id,
        model: modelId,
        fallbackUsed,
        latencyMs,
        costUsd: usageRecord.costUsd,
        retryApplied,
        aiToneScore,
      });
    } catch (err) {
      logger.error("resume generation persist failed", {
        userId: auth.id,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  })();

  return result.toTextStreamResponse({
    headers: {
      "X-Resume-AI-Model": chosen.modelId,
      "X-Resume-AI-Fallback": fallbackUsed ? "1" : "0",
    },
  });
}
