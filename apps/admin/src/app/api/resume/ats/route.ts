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
import {
  buildAtsSystemPrompt,
  buildAtsUserPrompt,
} from "@portfolio/ai/prompts/ats";
import { refineAtsScore } from "@portfolio/ai/guardrails/ats-refine";
import { createClient } from "@/lib/supabase/server";
import {
  getResumeGenerationById,
  updateResumeGeneration,
} from "@portfolio/shared/supabase/queries";
import type { Json } from "@portfolio/shared/supabase/database.types";
import { isAllowedAdmin } from "@portfolio/shared/constants";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isAllowedAdmin(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const rate = await checkResumeAiRateLimit(user.id);
  if (!rate.ok) {
    return NextResponse.json(
      { error: "Rate limit reached", retryAfterSeconds: rate.retryAfterSeconds },
      { status: 429 },
    );
  }

  const cap = await checkCostCap(supabase, user.id);
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
    const row = await getResumeGenerationById(supabase, body.generationId);
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

  let chosen = primary;
  let fallbackUsed = false;
  let result: Awaited<ReturnType<typeof runGen>>;
  try {
    result = await runGen(primary);
  } catch (err) {
    if (isProviderRateLimitError(err) && fallbacks.length > 0) {
      chosen = fallbacks[0]!;
      fallbackUsed = true;
      result = await runGen(chosen);
    } else {
      const message = err instanceof Error ? err.message : "ATS failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const ats = refineAtsScore(
    sanitizeLlmObject(result.object) as AtsScore,
  );
  const usageRecord = formatUsage(result.usage, chosen.modelId, {
    latencyMs: Date.now() - startedAt,
    fallbackUsed,
  });

  if (body.generationId) {
    try {
      const row = await getResumeGenerationById(supabase, body.generationId);
      const prevUsage =
        (row?.usage as Record<string, unknown> | null | undefined) ?? {};
      await updateResumeGeneration(supabase, body.generationId, {
        ats: (ats as unknown as Json) ?? null,
        usage: {
          ...prevUsage,
          ats: usageRecord,
        } as unknown as Json,
      });
    } catch (err) {
      console.error("[resume-ai] ats persist failed", err);
    }
  }

  return NextResponse.json({
    ats,
    model: chosen.modelId,
    fallbackUsed,
    usage: usageRecord,
  });
}
