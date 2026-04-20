import { z } from "zod";
import { tailoredResumeSchema } from "./tailored-resume";
import { coverLetterSchema } from "./cover-letter";

/** Single-call schema used by the "Generate Both" button to save tokens. */
export const combinedSchema = z.object({
  resume: tailoredResumeSchema,
  coverLetter: coverLetterSchema,
});

export type CombinedGeneration = z.infer<typeof combinedSchema>;
