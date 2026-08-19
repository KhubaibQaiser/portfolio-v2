import { z } from "zod";
import { coverLetterSchema, tailoredResumeSchema } from "@portfolio/ai/schemas";

/**
 * What `/api/resume/export` stores in `RenderJobInsert.payload` after it has
 * already validated the request (freshness hashes, policy enforcement, fact
 * checks). The worker re-parses this with these schemas before rendering —
 * defense against a corrupted/tampered DynamoDB item, not re-validation of
 * business rules the enqueue route already enforced.
 */
export const resumeRenderJobPayloadSchema = z
  .object({
    layoutId: z.string().min(1),
    tailoredResume: tailoredResumeSchema,
  })
  .strict();
export type ResumeRenderJobPayload = z.infer<typeof resumeRenderJobPayloadSchema>;

export const coverLetterRenderJobPayloadSchema = z
  .object({
    letter: coverLetterSchema,
    meta: z
      .object({
        company: z.string().max(200).optional(),
        role: z.string().max(200).optional(),
      })
      .optional(),
  })
  .strict();
export type CoverLetterRenderJobPayload = z.infer<
  typeof coverLetterRenderJobPayloadSchema
>;
