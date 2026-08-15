import { NextResponse } from "next/server";
import { generateText } from "ai";
import { z } from "zod";
import {
  ensureAiApiKeys,
  fallbackChainFor,
  formatUsage,
  isProviderRateLimitError,
  modelFor,
  type ResolvedModel,
} from "@portfolio/ai";
import {
  atsScoreSchema,
  tailoredResumeSchema,
  type AtsScore,
} from "@portfolio/ai/schemas";
import { trimJobDescription } from "@portfolio/ai/context/trim-job-description";
import {
  stripPromptInjection,
  wrapUntrusted,
} from "@portfolio/ai/guardrails/prompt-injection";
import {
  parseJsonObjectFromLlm,
  sanitizeLlmObject,
} from "@portfolio/ai/guardrails/output-sanitize";
import { buildAtsSystemPrompt, buildAtsUserPrompt } from "@portfolio/ai/prompts/ats";
import { refineAtsScore } from "@portfolio/ai/guardrails/ats-refine";
import { enforceResumeGenerationPolicy } from "@portfolio/ai/policy/resume-generation-policy";
import { getContentRepository } from "@portfolio/data";
import type { ResumeGenerationUsage } from "@portfolio/shared/schemas";
import { requireAdmin } from "@/lib/auth-guard";
import { logger } from "@/lib/logger";
import { checkResumeAiRateLimit } from "@/lib/resume-ai/rate-limit";
import { checkCostCap } from "@/lib/resume-ai/cost-cap";
import { createGenerationSnapshot } from "@/lib/resume-ai/generation-snapshot";
import { loadCandidateFactsUncached } from "@/lib/resume-ai/load-candidate-facts";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z
  .object({
    generationId: z.string().min(1),
    resume: tailoredResumeSchema,
    layoutId: z.string().min(1),
    sourceHash: z.string().min(1),
    guidelineHash: z.string().min(1),
    jobDescription: z.string().min(20).max(20_000),
  })
  .strict();

type Body = z.infer<typeof bodySchema>;

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  const repo = getContentRepository();

  let body: Body;
  try {
    body = bodySchema.parse(await request.json());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const rate = await checkResumeAiRateLimit(auth.id);
  if (!rate.ok) {
    return NextResponse.json(
      { error: "Rate limit reached", retryAfterSeconds: rate.retryAfterSeconds },
      { status: 429 },
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
        error: `Daily cost cap reached ($${cap.spentUsd.toFixed(2)} / $${cap.capUsd.toFixed(2)}).`,
      },
      { status: 402 },
    );
  }

  try {
    await ensureAiApiKeys("cheap");
  } catch (error) {
    logger.error("failed to load AI API keys from Secrets Manager", {
      error: error instanceof Error ? error : new Error(String(error)),
    });
    return NextResponse.json(
      { error: "ATS scoring is not configured yet. Please try again later." },
      { status: 503 },
    );
  }

  const row = await repo.getResumeGenerationById(body.generationId);
  if (
    !row ||
    row.created_by !== auth.id ||
    row.deleted_at ||
    !row.source_snapshot ||
    row.layout_id !== body.layoutId
  ) {
    return NextResponse.json(
      { error: "Generation is missing, legacy, or does not match the layout." },
      { status: 409 },
    );
  }
  const layout = await repo.getResumeLayoutById(body.layoutId);
  if (!layout) {
    return NextResponse.json(
      { error: "Resume layout no longer exists." },
      { status: 409 },
    );
  }
  const facts = await loadCandidateFactsUncached();
  const snapshot = createGenerationSnapshot(facts, layout.guidelines, layout.version);
  if (
    body.sourceHash !== row.source_snapshot.sourceHash ||
    body.sourceHash !== snapshot.sourceHash ||
    body.guidelineHash !== row.source_snapshot.guidelineHash ||
    body.guidelineHash !== snapshot.guidelineHash
  ) {
    return NextResponse.json(
      { error: "Resume source or layout changed. Regenerate before ATS scoring." },
      { status: 409 },
    );
  }
  const tailored = enforceResumeGenerationPolicy(
    sanitizeLlmObject(body.resume),
    facts,
    layout.guidelines,
  ).resume;

  const wrappedJd = wrapUntrusted(
    trimJobDescription(stripPromptInjection(body.jobDescription)),
  );

  const system = buildAtsSystemPrompt();
  const prompt = buildAtsUserPrompt(tailored, wrappedJd);

  const startedAt = Date.now();
  const primary = modelFor("cheap");
  const fallbacks = fallbackChainFor("cheap");

  async function runGen(resolved: ResolvedModel) {
    const gen = await generateText({
      model: resolved.model,
      system,
      prompt,
      abortSignal: request.signal,
      temperature: 0.2,
      maxOutputTokens: 700,
    });

    let raw: unknown;
    try {
      raw = parseJsonObjectFromLlm(gen.text);
    } catch (e) {
      throw new Error(
        e instanceof Error ? `ATS JSON parse: ${e.message}` : "ATS JSON parse failed",
      );
    }

    const parsed = atsScoreSchema.safeParse(sanitizeLlmObject(raw));
    if (!parsed.success) {
      throw new Error(`ATS schema: ${parsed.error.message}`);
    }

    return {
      object: parsed.data,
      usage: gen.totalUsage,
    };
  }

  logger.info("ats scoring requested", {
    userId: auth.id,
    model: primary.modelId,
    fromGenerationId: Boolean(body.generationId),
  });

  let chosen = primary;
  let fallbackUsed = false;
  let result: Awaited<ReturnType<typeof runGen>>;
  try {
    result = await runGen(primary);
  } catch (err) {
    if (isProviderRateLimitError(err) && fallbacks.length > 0) {
      chosen = fallbacks[0]!;
      fallbackUsed = true;
      logger.warn("ats primary model rate-limited, falling back", {
        userId: auth.id,
        primary: primary.modelId,
        fallback: chosen.modelId,
      });
      result = await runGen(chosen);
    } else {
      logger.error("ats scoring failed", {
        userId: auth.id,
        model: primary.modelId,
        error: err instanceof Error ? err : new Error(String(err)),
      });
      const message = err instanceof Error ? err.message : "ATS failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const ats: AtsScore = refineAtsScore(sanitizeLlmObject(result.object));
  const usageRecord = formatUsage(result.usage, chosen.modelId, {
    latencyMs: Date.now() - startedAt,
    fallbackUsed,
  });

  try {
    const prevUsage = row.usage ?? {};
    await repo.updateResumeGeneration(body.generationId, {
      ats: { ...ats },
      usage: {
        ...prevUsage,
        ats: usageRecord,
        inputTokens: (prevUsage.inputTokens ?? 0) + (usageRecord.inputTokens ?? 0),
        outputTokens: (prevUsage.outputTokens ?? 0) + (usageRecord.outputTokens ?? 0),
        totalTokens: (prevUsage.totalTokens ?? 0) + (usageRecord.totalTokens ?? 0),
        costUsd: (prevUsage.costUsd ?? 0) + (usageRecord.costUsd ?? 0),
      } as ResumeGenerationUsage,
    });
  } catch (err) {
    logger.error("ats persist failed", {
      userId: auth.id,
      generationId: body.generationId,
      error: err instanceof Error ? err : new Error(String(err)),
    });
    return NextResponse.json(
      { error: "ATS score could not be saved. Please retry." },
      { status: 500 },
    );
  }

  logger.info("ats scoring completed", {
    userId: auth.id,
    model: chosen.modelId,
    fallbackUsed,
    score: ats.score,
  });

  return NextResponse.json({
    ats,
    model: chosen.modelId,
    fallbackUsed,
    usage: usageRecord,
  });
}
