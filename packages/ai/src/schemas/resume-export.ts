import { z } from "zod";

import { tailoredResumeSchema } from "./tailored-resume";

export const resumeExportRequestSchema = z
  .object({
    generationId: z.string().min(1),
    resume: tailoredResumeSchema,
    layoutId: z.string().min(1),
    sourceHash: z.string().min(1),
    guidelineHash: z.string().min(1),
  })
  .strict();

export const resumeExportValidationErrorSchema = z
  .object({
    error: z
      .object({
        code: z.enum([
          "INVALID_EXPORT_REQUEST",
          "GENERATION_NOT_FOUND",
          "STALE_SOURCE",
          "STALE_LAYOUT",
          "FACT_VALIDATION_FAILED",
        ]),
        message: z.string().min(1),
        fields: z.record(z.string(), z.array(z.string())),
      })
      .strict(),
  })
  .strict();

export type ResumeExportRequest = z.infer<typeof resumeExportRequestSchema>;
