import { NoObjectGeneratedError, generateObject } from "ai";
import {
  fallbackChainFor,
  formatUsage,
  isProviderRateLimitError,
  modelFor,
  type ModelId,
  type ModelMode,
  type ResolvedModel,
  type LlmUsage,
} from "@portfolio/ai";
import type { CandidateFacts } from "@portfolio/ai/context/build-candidate-facts";
import { collectTextForToneCheck, scoreAiTone } from "@portfolio/ai/guardrails/ai-tone";
import { validateFabrication } from "@portfolio/ai/guardrails/fabrication-check";
import { sanitizeLlmObject } from "@portfolio/ai/guardrails/output-sanitize";
import {
  enforceResumeGenerationPolicy,
  ResumePolicyError,
} from "@portfolio/ai/policy/resume-generation-policy";
import {
  buildCoverLetterSystemPrompt,
  buildCoverLetterUserPrompt,
} from "@portfolio/ai/prompts/cover-letter";
import {
  buildResumeSystemPrompt,
  buildResumeUserPrompt,
} from "@portfolio/ai/prompts/resume";
import {
  coverLetterSchema,
  tailoredResumeSchema,
  type CoverLetter,
  type ResumeGenerationAttempt,
  type TailoredResume,
} from "@portfolio/ai/schemas";
import type { ResumeGenerationUsage, VariantGuidelines } from "@portfolio/shared/schemas";

const AI_TONE_THRESHOLD = 35;
const MAX_CORRECTIVE_ATTEMPTS_PER_MODEL = 2;
const MAX_RESUME_ATTEMPTS = 3;
const MAX_COVER_LETTER_ATTEMPTS = 2;
const MAX_ATTEMPT_MS = 30_000;
const MIN_ATTEMPT_BUDGET_MS = 8_000;
const RESUME_OUTPUT_TOKENS = 6000;
const COVER_LETTER_OUTPUT_TOKENS = 3200;

type ArtifactKind = "resume" | "cover_letter" | "both";

export type ValidatedGenerationOptions = {
  kind: ArtifactKind;
  modelMode: Exclude<ModelMode, "cheap">;
  wrappedJobDescription: string;
  facts: CandidateFacts;
  guidelines: VariantGuidelines;
  signal: AbortSignal;
  deadlineAt: number;
  company?: string;
  role?: string;
  hiringManager?: string;
  tone?: "formal" | "friendly" | "enthusiastic";
  length?: "short" | "standard" | "detailed";
  language?: "en" | "de" | "fr";
  mustTryToInclude?: string[];
};

export type ValidatedGenerationResult = {
  resume: TailoredResume | null;
  coverLetter: CoverLetter | null;
  attempts: ResumeGenerationAttempt[];
  warnings: string[];
  usage: ResumeGenerationUsage;
  model: ModelId;
  fallbackUsed: boolean;
};

export class ValidatedGenerationError extends Error {
  constructor(
    readonly code:
      | "INVALID_MODEL_OUTPUT"
      | "OUTPUT_TRUNCATED"
      | "FACT_VALIDATION_FAILED"
      | "PROVIDER_UNAVAILABLE"
      | "GENERATION_TIMEOUT",
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ValidatedGenerationError";
  }
}

function attemptReason(error: unknown): string {
  if (NoObjectGeneratedError.isInstance(error)) {
    return error.finishReason === "length" ? "output_truncated" : "invalid_model_output";
  }
  if (error instanceof ResumePolicyError) return "layout_or_fact_validation";
  if (isProviderRateLimitError(error)) return "provider_unavailable";
  if (isAbortError(error)) return "aborted";
  return "generation_failed";
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

function usageFromError(error: unknown): LlmUsage | null {
  if (
    typeof error !== "object" ||
    error === null ||
    !("usage" in error) ||
    typeof error.usage !== "object" ||
    error.usage === null
  ) {
    return null;
  }
  const usage = error.usage;
  return {
    ...("inputTokens" in usage && typeof usage.inputTokens === "number"
      ? { inputTokens: usage.inputTokens }
      : {}),
    ...("outputTokens" in usage && typeof usage.outputTokens === "number"
      ? { outputTokens: usage.outputTokens }
      : {}),
    ...("totalTokens" in usage && typeof usage.totalTokens === "number"
      ? { totalTokens: usage.totalTokens }
      : {}),
  };
}

function retryReason(error: unknown): string {
  if (NoObjectGeneratedError.isInstance(error)) {
    return error.finishReason === "length"
      ? "The previous response was truncated. Return a shorter complete object with every required key."
      : "The previous response did not match the strict schema. Return every required key with the exact declared type.";
  }
  if (error instanceof ResumePolicyError) {
    return `The previous response failed validation: ${error.violations
      .slice(0, 8)
      .join(
        "; ",
      )}. Use only exact source IDs, bullet indexes, and canonical skill names.`;
  }
  return "The previous provider attempt failed. Return one complete object matching the schema.";
}

function validateCoverLetterFacts(
  coverLetter: CoverLetter,
  options: ValidatedGenerationOptions,
): void {
  const sourceText = [
    options.facts.factSheet,
    options.company,
    options.role,
    options.hiringManager,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLocaleLowerCase();
  const letterText = [
    coverLetter.greeting,
    ...coverLetter.body,
    coverLetter.closing,
    coverLetter.signOff,
  ].join(" ");
  const sourceNumbers = new Set(
    (sourceText.match(/[$€£]?\d[\d,.]*(?:%|x|k|m|b)?/gi) ?? []).map((value) =>
      value.toLocaleLowerCase(),
    ),
  );
  const unsupportedNumbers = (
    letterText.match(/[$€£]?\d[\d,.]*(?:%|x|k|m|b)?/gi) ?? []
  ).filter((value) => !sourceNumbers.has(value.toLocaleLowerCase()));
  if (unsupportedNumbers.length > 0) {
    throw new ResumePolicyError([
      `cover letter adds unsupported numeric claims: ${unsupportedNumbers.join(", ")}`,
    ]);
  }
}

function orderedModels(mode: Exclude<ModelMode, "cheap">): ResolvedModel[] {
  const models = [modelFor(mode), ...fallbackChainFor(mode)];
  return models.filter(
    (model, index) =>
      models.findIndex((candidate) => candidate.modelId === model.modelId) === index,
  );
}

function sumUsage(
  attempts: ResumeGenerationAttempt[],
  usages: ResumeGenerationUsage[],
): ResumeGenerationUsage {
  return {
    inputTokens: usages.reduce((sum, usage) => sum + (usage.inputTokens ?? 0), 0),
    outputTokens: usages.reduce((sum, usage) => sum + (usage.outputTokens ?? 0), 0),
    totalTokens: usages.reduce((sum, usage) => sum + (usage.totalTokens ?? 0), 0),
    costUsd: usages.reduce((sum, usage) => sum + (usage.costUsd ?? 0), 0),
    latencyMs: attempts.reduce((sum, attempt) => sum + attempt.latencyMs, 0),
    attempts,
  };
}

type AttemptResult<T> = {
  value: T;
  warnings: string[];
  usage: LlmUsage;
  finishReason: string | null;
};

type AttemptContext = {
  model: ResolvedModel;
  retry: number;
  lastError: unknown;
  signal: AbortSignal;
};

type AttemptBudget = {
  artifact: "resume" | "cover letter";
  models: ResolvedModel[];
  maxAttempts: number;
  deadlineAt: number;
  signal: AbortSignal;
  attempts: ResumeGenerationAttempt[];
  usages: ResumeGenerationUsage[];
};

async function runValidatedAttempts<T>(
  budget: AttemptBudget,
  generate: (context: AttemptContext) => Promise<AttemptResult<T>>,
): Promise<{ value: T; warnings: string[]; model: ModelId }> {
  const primaryModelId = budget.models[0]!.modelId;
  let lastError: unknown;
  let totalAttempts = 0;

  for (const model of budget.models) {
    for (
      let retry = 0;
      retry < MAX_CORRECTIVE_ATTEMPTS_PER_MODEL && totalAttempts < budget.maxAttempts;
      retry += 1
    ) {
      const remainingMs = budget.deadlineAt - Date.now();
      if (budget.signal.aborted || remainingMs < MIN_ATTEMPT_BUDGET_MS) {
        throw new ValidatedGenerationError(
          "GENERATION_TIMEOUT",
          `${budget.artifact === "resume" ? "Resume" : "Cover-letter"} generation ran out of time. Try again or use the faster model.`,
          true,
        );
      }

      totalAttempts += 1;
      const startedAt = Date.now();
      const attemptSignal = AbortSignal.any([
        budget.signal,
        AbortSignal.timeout(Math.min(remainingMs, MAX_ATTEMPT_MS)),
      ]);

      try {
        const result = await generate({
          model,
          retry,
          lastError,
          signal: attemptSignal,
        });
        const latencyMs = Date.now() - startedAt;
        const usage = formatUsage(result.usage, model.modelId, {
          latencyMs,
          fallbackUsed: model.modelId !== primaryModelId,
        });
        budget.usages.push(usage);
        budget.attempts.push({
          model: model.modelId,
          reason:
            totalAttempts === 1
              ? "initial"
              : retry === 0
                ? "provider_fallback"
                : "corrective_retry",
          finishReason: result.finishReason,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          latencyMs,
        });
        return {
          value: result.value,
          warnings: result.warnings,
          model: model.modelId,
        };
      } catch (error) {
        lastError = error;
        const latencyMs = Date.now() - startedAt;
        const failedUsage = usageFromError(error);
        if (failedUsage) {
          budget.usages.push(
            formatUsage(failedUsage, model.modelId, {
              latencyMs,
              fallbackUsed: model.modelId !== primaryModelId,
            }),
          );
        }
        budget.attempts.push({
          model: model.modelId,
          reason: attemptReason(error),
          finishReason: NoObjectGeneratedError.isInstance(error)
            ? (error.finishReason ?? null)
            : null,
          latencyMs,
        });

        if (budget.signal.aborted) {
          throw new ValidatedGenerationError(
            "GENERATION_TIMEOUT",
            `${budget.artifact === "resume" ? "Resume" : "Cover-letter"} generation timed out or was cancelled.`,
            true,
          );
        }
        if (isProviderRateLimitError(error) || isAbortError(error)) break;
      }
    }
  }

  if (lastError instanceof ResumePolicyError) {
    throw new ValidatedGenerationError(
      "FACT_VALIDATION_FAILED",
      `The generated ${budget.artifact} could not be verified against your source profile.`,
      true,
    );
  }
  if (NoObjectGeneratedError.isInstance(lastError)) {
    throw new ValidatedGenerationError(
      lastError.finishReason === "length" ? "OUTPUT_TRUNCATED" : "INVALID_MODEL_OUTPUT",
      `The model did not return a complete valid ${budget.artifact}.`,
      true,
    );
  }
  if (isAbortError(lastError) || Date.now() >= budget.deadlineAt) {
    throw new ValidatedGenerationError(
      "GENERATION_TIMEOUT",
      `${budget.artifact === "resume" ? "Resume" : "Cover-letter"} generation ran out of time. Try again or use the faster model.`,
      true,
    );
  }
  throw new ValidatedGenerationError(
    "PROVIDER_UNAVAILABLE",
    "All configured AI providers are temporarily unavailable.",
    true,
  );
}

async function generateResume(
  options: ValidatedGenerationOptions,
  models: ResolvedModel[],
  attempts: ResumeGenerationAttempt[],
  usages: ResumeGenerationUsage[],
): Promise<{ resume: TailoredResume; warnings: string[]; model: ModelId }> {
  const prompt = buildResumeUserPrompt(options.wrappedJobDescription);

  const result = await runValidatedAttempts<TailoredResume>(
    {
      artifact: "resume",
      models,
      maxAttempts: MAX_RESUME_ATTEMPTS,
      deadlineAt: options.deadlineAt,
      signal: options.signal,
      attempts,
      usages,
    },
    async ({ model, retry, lastError, signal }) => {
      const generated = await generateObject({
        model: model.model,
        schema: tailoredResumeSchema,
        system: buildResumeSystemPrompt(
          options.facts,
          {
            tone: options.tone,
            length: options.length,
            language: options.language,
            company: options.company,
            role: options.role,
            mustTryToInclude: options.mustTryToInclude,
            retryReason: retry > 0 ? retryReason(lastError) : undefined,
          },
          options.guidelines,
        ),
        prompt,
        abortSignal: signal,
        temperature: retry > 0 ? 0.2 : 0.4,
        maxOutputTokens: RESUME_OUTPUT_TOKENS,
      });
      const normalized = enforceResumeGenerationPolicy(
        sanitizeLlmObject(generated.object),
        options.facts,
        options.guidelines,
      );
      const fabrication = validateFabrication(normalized.resume, options.facts.idMap);
      if (!fabrication.ok) {
        throw new ResumePolicyError(fabrication.offending);
      }

      const warnings = [...normalized.warnings];
      const tone = scoreAiTone(collectTextForToneCheck(normalized.resume));
      if (tone.score >= AI_TONE_THRESHOLD) {
        warnings.push(
          `Wording may read as AI-generated (${tone.hits.slice(0, 4).join(", ")}). Review before sending.`,
        );
      }

      return {
        value: normalized.resume,
        warnings,
        usage: generated.usage,
        finishReason: generated.finishReason ?? null,
      };
    },
  );

  return {
    resume: result.value,
    warnings: result.warnings,
    model: result.model,
  };
}

async function generateCoverLetter(
  options: ValidatedGenerationOptions,
  models: ResolvedModel[],
  attempts: ResumeGenerationAttempt[],
  usages: ResumeGenerationUsage[],
): Promise<{ coverLetter: CoverLetter; model: ModelId }> {
  const prompt = buildCoverLetterUserPrompt(options.wrappedJobDescription);
  const schema = coverLetterSchema.strict();

  const result = await runValidatedAttempts<CoverLetter>(
    {
      artifact: "cover letter",
      models,
      maxAttempts: MAX_COVER_LETTER_ATTEMPTS,
      deadlineAt: options.deadlineAt,
      signal: options.signal,
      attempts,
      usages,
    },
    async ({ model, retry, lastError, signal }) => {
      const generated = await generateObject({
        model: model.model,
        schema,
        system: buildCoverLetterSystemPrompt(options.facts, {
          tone: options.tone,
          length: options.length,
          language: options.language,
          company: options.company,
          role: options.role,
          hiringManager: options.hiringManager,
          retryReason: retry > 0 ? retryReason(lastError) : undefined,
        }),
        prompt,
        abortSignal: signal,
        temperature: retry > 0 ? 0.2 : 0.4,
        maxOutputTokens: COVER_LETTER_OUTPUT_TOKENS,
      });
      const coverLetter = schema.parse(sanitizeLlmObject(generated.object));
      validateCoverLetterFacts(coverLetter, options);

      return {
        value: coverLetter,
        warnings: [],
        usage: generated.usage,
        finishReason: generated.finishReason ?? null,
      };
    },
  );

  return { coverLetter: result.value, model: result.model };
}

export async function generateValidatedContent(
  options: ValidatedGenerationOptions,
): Promise<ValidatedGenerationResult> {
  const models = orderedModels(options.modelMode);
  const attempts: ResumeGenerationAttempt[] = [];
  const usages: ResumeGenerationUsage[] = [];
  let resume: TailoredResume | null = null;
  let coverLetter: CoverLetter | null = null;
  let warnings: string[] = [];
  let chosenModel = models[0]!.modelId;

  if (options.kind === "both") {
    const siblingAbort = new AbortController();
    const parallelOptions = {
      ...options,
      signal: AbortSignal.any([options.signal, siblingAbort.signal]),
    };
    try {
      const [resumeResult, coverLetterResult] = await Promise.all([
        generateResume(parallelOptions, models, attempts, usages),
        generateCoverLetter(parallelOptions, models, attempts, usages),
      ]);
      resume = resumeResult.resume;
      coverLetter = coverLetterResult.coverLetter;
      warnings = resumeResult.warnings;
      chosenModel = resumeResult.model;
    } catch (error) {
      siblingAbort.abort();
      throw error;
    }
  } else if (options.kind === "resume") {
    const result = await generateResume(options, models, attempts, usages);
    resume = result.resume;
    warnings = result.warnings;
    chosenModel = result.model;
  } else {
    const result = await generateCoverLetter(options, models, attempts, usages);
    coverLetter = result.coverLetter;
    chosenModel = result.model;
  }

  return {
    resume,
    coverLetter,
    attempts,
    warnings,
    usage: sumUsage(attempts, usages),
    model: chosenModel,
    fallbackUsed: attempts.some((attempt) => attempt.model !== models[0]!.modelId),
  };
}
