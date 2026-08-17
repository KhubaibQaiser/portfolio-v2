import { z } from "zod";

/**
 * A bullet the model returns MUST reference an existing experience + bullet
 * in the source data. `fabrication-check` rejects ids not present in the
 * prompt's idMap, which structurally prevents invented employers / bullets.
 */
export const tailoredBulletSchema = z
  .object({
    experienceId: z
      .string()
      .min(1)
      .describe("Exact immutable experience id copied from the fact sheet."),
    sourceBulletIndex: z
      .number()
      .int()
      .nonnegative()
      .describe("0-based index into the source experience's bullets."),
    text: z
      .string()
      .min(10)
      .max(280)
      .describe(
        "Rewritten bullet. Rephrase/reorder only; never invent metrics or facts. Max ~22 words.",
      ),
  })
  .strict();

export type TailoredBullet = z.infer<typeof tailoredBulletSchema>;

export const tailoredExperienceSchema = z
  .object({
    experienceId: z.string().min(1),
    bullets: z.array(tailoredBulletSchema).min(1).max(10),
  })
  .strict();

export type TailoredExperience = z.infer<typeof tailoredExperienceSchema>;

export const tailoredSkillGroupSchema = z
  .object({
    category: z.string().min(1),
    items: z.array(z.string().min(1)).min(1).max(8),
  })
  .strict();

export type TailoredSkillGroup = z.infer<typeof tailoredSkillGroupSchema>;

export const tailoredResumeSchema = z
  .object({
    summary: z
      .string()
      .min(80)
      .max(450)
      .describe("Professional summary tailored to the JD. 2 sentences. No AI cliches."),
    titleOverride: z
      .string()
      .max(80)
      .nullable()
      .describe("JD-aligned job title when truthful to candidate level, otherwise null."),
    keywords: z
      .array(z.string().min(1))
      .max(25)
      .describe("ATS keyword list the summary + bullets cover. Truthful to source only."),
    highlightedSkills: z
      .array(z.string().min(1))
      .max(25)
      .describe(
        "Exact skill names copied from the source skills that directly match the job description.",
      ),
    experiences: z.array(tailoredExperienceSchema).min(1).max(8),
    skills: z
      .array(tailoredSkillGroupSchema)
      .min(1)
      .max(6)
      .describe("Skills regrouped/reordered to surface JD-relevant categories first."),
  })
  .strict();

export const storedTailoredResumeSchema = tailoredResumeSchema.extend({
  titleOverride: z.string().max(80).nullable().optional().default(null),
  keywords: z.array(z.string().min(1)).max(25).optional().default([]),
  highlightedSkills: z.array(z.string().min(1)).max(25).optional().default([]),
  skills: z.array(tailoredSkillGroupSchema).max(6).optional().default([]),
});

export type TailoredResume = z.infer<typeof tailoredResumeSchema>;
