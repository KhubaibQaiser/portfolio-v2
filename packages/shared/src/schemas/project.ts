import { z } from "zod";

export const projectTypeEnum = z.enum([
  "web",
  "mobile",
  "game",
  "open-source",
  "other",
]);

export type ProjectType = z.infer<typeof projectTypeEnum>;

export const projectSchema = z.object({
  title: z.string().min(1).max(150),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().min(1).max(10000),
  summary: z.string().min(1).max(300),
  cover_url: z.string().url().nullable(),
  tech_tags: z.array(z.string().min(1)).min(1),
  role: z.string().min(1).max(150),
  type: projectTypeEnum,
  github_url: z.string().url().nullable(),
  live_url: z.string().url().nullable(),
  playstore_url: z.string().url().nullable(),
  appstore_url: z.string().url().nullable(),
  is_featured: z.boolean(),
  sort_order: z.number().int().min(0),
});

export type ProjectFormData = z.infer<typeof projectSchema>;

export const projectRowSchema = projectSchema.extend({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Project = z.infer<typeof projectRowSchema>;
