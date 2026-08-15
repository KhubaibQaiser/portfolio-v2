import { z } from "zod";

import { coverLetterSchema } from "./cover-letter";
import { tailoredResumeSchema } from "./tailored-resume";

export const resumeGenerationErrorCodeSchema = z.enum([
  "INVALID_MODEL_OUTPUT",
  "OUTPUT_TRUNCATED",
  "FACT_VALIDATION_FAILED",
  "PROVIDER_UNAVAILABLE",
  "GENERATION_TIMEOUT",
  "PERSISTENCE_FAILED",
]);

export const resumeGenerationAttemptSchema = z
  .object({
    model: z.string().min(1),
    reason: z.string().min(1),
    finishReason: z.string().nullable(),
    inputTokens: z.number().int().nonnegative().optional(),
    outputTokens: z.number().int().nonnegative().optional(),
    latencyMs: z.number().int().nonnegative(),
  })
  .strict();

export const resumeGenerationSuccessSchema = z
  .object({
    generationId: z.string().min(1),
    resume: tailoredResumeSchema.nullable(),
    coverLetter: coverLetterSchema.strict().nullable(),
    appliedChanges: z.array(z.string()),
    layout: z
      .object({
        id: z.string().min(1),
        version: z.number().int().positive(),
        sourceHash: z.string().min(1),
        guidelineHash: z.string().min(1),
      })
      .strict(),
    metadata: z
      .object({
        attempts: z.array(resumeGenerationAttemptSchema).min(1),
        warnings: z.array(z.string()),
        fitReport: z.record(z.string(), z.unknown()).nullable(),
      })
      .strict(),
  })
  .strict();

export const resumeGenerationErrorSchema = z
  .object({
    error: z
      .object({
        code: resumeGenerationErrorCodeSchema,
        message: z.string().min(1),
        retryable: z.boolean(),
      })
      .strict(),
  })
  .strict();

export type ResumeGenerationErrorCode = z.infer<typeof resumeGenerationErrorCodeSchema>;
export type ResumeGenerationAttempt = z.infer<typeof resumeGenerationAttemptSchema>;
export type ResumeGenerationSuccess = z.infer<typeof resumeGenerationSuccessSchema>;
