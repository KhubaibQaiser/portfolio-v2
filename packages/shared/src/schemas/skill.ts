import { z } from "zod";

export const skillCategoryEnum = z.enum([
  "frontend",
  "mobile",
  "backend",
  "cloud",
  "devops",
  "testing",
  "tools",
  "build",
  "state",
  "cms",
  "legacy",
]);

export type SkillCategory = z.infer<typeof skillCategoryEnum>;

export const skillSchema = z.object({
  name: z.string().min(1).max(100),
  category: skillCategoryEnum,
  proficiency: z.number().int().min(0).max(100),
  icon: z.string().nullable(),
  years: z.number().min(0).max(30),
  sort_order: z.number().int().min(0),
});

export type SkillFormData = z.infer<typeof skillSchema>;

export const skillRowSchema = skillSchema.extend({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Skill = z.infer<typeof skillRowSchema>;
