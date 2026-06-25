import { NextResponse } from "next/server";
import { generateText } from "ai";
import { z } from "zod";
import {
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
import { getContentRepository } from "@portfolio/data";
import type { ResumeGenerationUsage } from "@portfolio/shared/schemas";
import { requireAdmin } from "@/lib/auth-guard";
import { logger } from "@/lib/logger";
import { checkResumeAiRateLimit } from "@/lib/resume-ai/rate-limit";
import { checkCostCap } from "@/lib/resume-ai/cost-cap";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({
  generationId: z.string().uuid().optional(),
  resume: tailoredResumeSchema.optional(),
  jobDescription: z.string().min(20).max(20_000),
});

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

  if (!body.resume && !body.generationId) {
    return NextResponse.json(
      { error: "Provide either `resume` or `generationId`" },
      { status: 400 },
    );
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

  let tailored = body.resume;
  if (!tailored && body.generationId) {
    const row = await repo.getResumeGenerationById(body.generationId);
    if (!row || !row.resume) {
      return NextResponse.json(
        { error: "Generation not found or has no resume" },
        { status: 404 },
      );
    }
    const parsed = tailoredResumeSchema.safeParse(row.resume);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Stored resume is incompatible with current schema" },
        { status: 409 },
      );
    }
    tailored = parsed.data;
  }

  if (!tailored) {
    return NextResponse.json({ error: "Missing resume" }, { status: 400 });
  }

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

  const ats = refineAtsScore(sanitizeLlmObject(result.object) as AtsScore);
  const usageRecord = formatUsage(result.usage, chosen.modelId, {
    latencyMs: Date.now() - startedAt,
    fallbackUsed,
  });

  if (body.generationId) {
    try {
      const row = await repo.getResumeGenerationById(body.generationId);
      const prevUsage = (row?.usage as Record<string, unknown> | null | undefined) ?? {};
      await repo.updateResumeGeneration(body.generationId, {
        ats: (ats as unknown as Record<string, unknown>) ?? null,
        usage: {
          ...prevUsage,
          ats: usageRecord,
        } as unknown as ResumeGenerationUsage,
      });
    } catch (err) {
      logger.error("ats persist failed", {
        userId: auth.id,
        generationId: body.generationId,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
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
