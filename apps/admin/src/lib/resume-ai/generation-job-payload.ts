import { z } from "zod";

/**
 * What `/api/resume/generate` stores in `GenerationJobInsert.payload` after it
 * has already sanitized the JD and resolved a live layout. The worker
 * re-parses this before calling the model — defense against a corrupted
 * DynamoDB item, not a second pass of the HTTP body schema.
 */
export const generationJobPayloadSchema = z
  .object({
    kind: z.enum(["resume", "cover_letter", "both"]),
    jdText: z.string().min(20).max(20_000),
    jdSource: z.enum(["paste", "pdf"]),
    layoutId: z.string().min(1),
    layoutVersion: z.number().int().positive(),
    model: z.enum(["quality", "fast"]),
    company: z.string().max(200).optional(),
    role: z.string().max(200).optional(),
    hiringManager: z.string().max(200).optional(),
    mustTryToInclude: z.array(z.string().max(80)).max(40).optional(),
  })
  .strict();

export type GenerationJobPayload = z.infer<typeof generationJobPayloadSchema>;
