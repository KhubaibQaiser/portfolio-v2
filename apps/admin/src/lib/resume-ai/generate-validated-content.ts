import { NoObjectGeneratedError, generateObject } from "ai";
import {
  fallbackChainFor,
  formatUsage,
  isProviderRateLimitError,
  isRequestTooLargeError,
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
/** Reserve for Dynamo persist + JSON serialize after the last model call. */
const ESTIMATED_PERSIST_MS = 4_000;
/** Don't start a validation retry that will almost certainly time out. */
const VALIDATION_RETRY_MIN_MS = 15_000;
const RESUME_OUTPUT_TOKENS = 2500;
const COVER_LETTER_OUTPUT_TOKENS = 1200;

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

export type GenerationFailureCategory =
  | "authentication"
  | "authorization"
  | "billing_or_quota"
  | "request_too_large"
  | "rate_limit_or_overload"
  | "model_not_found"
  | "bad_request"
  | "provider_server_error"
  | "network"
  | "timeout_or_abort"
  | "invalid_model_output"
  | "validation"
  | "unknown";

export type GenerationFailureDiagnostic = {
  artifact: "resume" | "cover letter";
  model: ModelId;
  provider: ResolvedModel["provider"];
  attempt: number;
  retry: number;
  category: GenerationFailureCategory;
  statusCode?: number;
  errorName: string;
  providerErrorCode?: string;
  latencyMs: number;
  remainingMsAtFailure: number;
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
    readonly diagnostics: GenerationFailureDiagnostic[] = [],
  ) {
    super(message);
    this.name = "ValidatedGenerationError";
  }
}

function errorRecord(error: unknown): Record<string, unknown> | null {
  return typeof error === "object" && error !== null
    ? (error as Record<string, unknown>)
    : null;
}

function errorCause(error: unknown): unknown {
  return errorRecord(error)?.cause;
}

function errorText(error: unknown): string {
  const record = errorRecord(error);
  const direct = record?.message;
  const caused = errorRecord(record?.cause)?.message;
  return [direct, caused]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLocaleLowerCase();
}

function statusCodeFromError(error: unknown): number | undefined {
  for (const candidate of [errorRecord(error), errorRecord(errorCause(error))]) {
    const value = candidate?.statusCode ?? candidate?.status;
    if (
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 100 &&
      value <= 599
    ) {
      return value;
    }
  }
  return undefined;
}

function safeErrorIdentifier(value: unknown): string | undefined {
  return typeof value === "string" && /^[A-Za-z0-9_.:-]{1,80}$/.test(value)
    ? value
    : undefined;
}

function errorNameFromError(error: unknown): string {
  return (
    safeErrorIdentifier(errorRecord(error)?.name) ??
    safeErrorIdentifier(errorRecord(errorCause(error))?.name) ??
    "UnknownError"
  );
}

function providerErrorCodeFromError(error: unknown): string | undefined {
  const code =
    safeErrorIdentifier(errorRecord(error)?.code) ??
    safeErrorIdentifier(errorRecord(errorCause(error))?.code);
  return code &&
    /^(?:invalid|rate_limit|model|insufficient|context|server|service|authentication|permission|billing|quota|overloaded)[A-Za-z0-9_.:-]*$/.test(
      code,
    )
    ? code
    : undefined;
}

function failureCategory(error: unknown): GenerationFailureCategory {
  if (NoObjectGeneratedError.isInstance(error)) return "invalid_model_output";
  if (error instanceof ResumePolicyError) return "validation";
  if (isAbortError(error)) return "timeout_or_abort";

  const statusCode = statusCodeFromError(error);
  const message = errorText(error);
  if (statusCode === 401 || /invalid api key|authentication|unauthorized/.test(message)) {
    return "authentication";
  }
  if (statusCode === 403 || /forbidden|permission denied/.test(message)) {
    return "authorization";
  }
  if (isRequestTooLargeError(error)) {
    return "request_too_large";
  }
  if (
    statusCode === 402 ||
    /billing|insufficient (?:credit|fund)|credit balance|quota exhausted/.test(message)
  ) {
    return "billing_or_quota";
  }
  if (statusCode === 429 || statusCode === 529 || /rate limit|overloaded/.test(message)) {
    return "rate_limit_or_overload";
  }
  if (
    statusCode === 404 ||
    /model .*(?:not found|decommissioned)|unknown model/.test(message)
  ) {
    return "model_not_found";
  }
  if (statusCode !== undefined && statusCode >= 500) return "provider_server_error";
  if (statusCode === 400 || statusCode === 422) return "bad_request";
  if (/network|fetch failed|socket|dns|econnreset|econnrefused|enotfound/.test(message)) {
    return "network";
  }
  return "unknown";
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
  const name = errorRecord(error)?.name;
  const causeName = errorRecord(errorCause(error))?.name;
  return (
    name === "AbortError" ||
    name === "TimeoutError" ||
    causeName === "AbortError" ||
    causeName === "TimeoutError"
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

function splitArtifactDeadline(sharedDeadlineAt: number): number {
  const remainingMs = sharedDeadlineAt - Date.now();
  const half = Math.floor(remainingMs / 2);
  const budgetMs = Math.max(MIN_ATTEMPT_BUDGET_MS, half);
  return Math.min(sharedDeadlineAt, Date.now() + budgetMs);
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
  const diagnostics: GenerationFailureDiagnostic[] = [];
  let lastError: unknown;
  let totalAttempts = 0;

  for (const model of budget.models) {
    for (
      let retry = 0;
      retry < MAX_CORRECTIVE_ATTEMPTS_PER_MODEL && totalAttempts < budget.maxAttempts;
      retry += 1
    ) {
      const remainingMs = budget.deadlineAt - Date.now();
      if (
        budget.signal.aborted ||
        remainingMs < MIN_ATTEMPT_BUDGET_MS + ESTIMATED_PERSIST_MS
      ) {
        throw new ValidatedGenerationError(
          "GENERATION_TIMEOUT",
          `${budget.artifact === "resume" ? "Resume" : "Cover-letter"} generation ran out of time. Try again.`,
          true,
          diagnostics,
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
        diagnostics.push({
          artifact: budget.artifact,
          model: model.modelId,
          provider: model.provider,
          attempt: totalAttempts,
          retry,
          category: failureCategory(error),
          statusCode: statusCodeFromError(error),
          errorName: errorNameFromError(error),
          providerErrorCode: providerErrorCodeFromError(error),
          latencyMs,
          remainingMsAtFailure: budget.deadlineAt - Date.now(),
        });
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
            diagnostics,
          );
        }
        if (
          error instanceof ResumePolicyError &&
          budget.deadlineAt - Date.now() < VALIDATION_RETRY_MIN_MS
        ) {
          throw new ValidatedGenerationError(
            "FACT_VALIDATION_FAILED",
            `The generated ${budget.artifact} could not be verified against your source profile.`,
            true,
            diagnostics,
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
      diagnostics,
    );
  }
  if (NoObjectGeneratedError.isInstance(lastError)) {
    throw new ValidatedGenerationError(
      lastError.finishReason === "length" ? "OUTPUT_TRUNCATED" : "INVALID_MODEL_OUTPUT",
      `The model did not return a complete valid ${budget.artifact}.`,
      true,
      diagnostics,
    );
  }
  if (isAbortError(lastError) || Date.now() >= budget.deadlineAt) {
    throw new ValidatedGenerationError(
      "GENERATION_TIMEOUT",
      `${budget.artifact === "resume" ? "Resume" : "Cover-letter"} generation ran out of time. Try again.`,
      true,
      diagnostics,
    );
  }
  throw new ValidatedGenerationError(
    "PROVIDER_UNAVAILABLE",
    "All configured AI providers are temporarily unavailable.",
    true,
    diagnostics,
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
    const resumeResult = await generateResume(
      { ...options, deadlineAt: splitArtifactDeadline(options.deadlineAt) },
      models,
      attempts,
      usages,
    );
    resume = resumeResult.resume;
    warnings = resumeResult.warnings;
    chosenModel = resumeResult.model;
    const coverLetterResult = await generateCoverLetter(
      options,
      models,
      attempts,
      usages,
    );
    coverLetter = coverLetterResult.coverLetter;
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
