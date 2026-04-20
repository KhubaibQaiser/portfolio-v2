import { z } from "zod";

/**
 * A bullet the model returns MUST reference an existing experience + bullet
 * in the source data. `fabrication-check` rejects ids not present in the
 * prompt's idMap, which structurally prevents invented employers / bullets.
 */
export const tailoredBulletSchema = z.object({
  experienceId: z
    .string()
    .min(1)
    .describe("Stable id from the fact sheet, e.g. 'e1'."),
  sourceBulletIndex: z
    .number()
    .int()
    .nonnegative()
    .describe("0-based index into the source experience's bullets."),
  text: z
    .string()
    .min(10)
    .max(350)
    .describe(
      "Rewritten bullet. Rephrase/reorder only; never invent metrics or facts.",
    ),
});

export type TailoredBullet = z.infer<typeof tailoredBulletSchema>;

export const tailoredExperienceSchema = z.object({
  experienceId: z.string().min(1),
  bullets: z.array(tailoredBulletSchema).min(1).max(8),
});

export type TailoredExperience = z.infer<typeof tailoredExperienceSchema>;

export const tailoredSkillGroupSchema = z.object({
  category: z.string().min(1),
  items: z.array(z.string().min(1)).min(1).max(20),
});

export type TailoredSkillGroup = z.infer<typeof tailoredSkillGroupSchema>;

export const tailoredResumeSchema = z.object({
  summary: z
    .string()
    .min(80)
    .max(900)
    .describe(
      "Professional summary tailored to the JD. 2-4 sentences. No AI cliches.",
    ),
  keywords: z
    .array(z.string().min(1))
    .max(30)
    .describe(
      "ATS keyword list the summary + bullets cover. Truthful to source only.",
    ),
  experiences: z.array(tailoredExperienceSchema).min(1),
  skills: z
    .array(tailoredSkillGroupSchema)
    .min(1)
    .describe(
      "Skills regrouped/reordered to surface JD-relevant categories first.",
    ),
});

export type TailoredResume = z.infer<typeof tailoredResumeSchema>;
