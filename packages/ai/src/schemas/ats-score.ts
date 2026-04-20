import { z } from "zod";

export const atsScoreSchema = z.object({
  score: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("Overall ATS match score, 0-100."),
  matchedKeywords: z
    .array(z.string().min(1))
    .max(60)
    .describe("Keywords present in both the tailored resume and the JD."),
  missingKeywords: z
    .array(z.string().min(1))
    .max(40)
    .describe(
      "Keywords the JD emphasizes that are missing from the tailored resume.",
    ),
  suggestions: z
    .array(z.string().min(10).max(300))
    .max(8)
    .describe(
      "Concrete, actionable suggestions. No fabrication: only propose phrasings supportable by the source facts.",
    ),
});

export type AtsScore = z.infer<typeof atsScoreSchema>;
