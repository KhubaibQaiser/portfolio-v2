import { z } from "zod";

export const aboutSchema = z.object({
  bio: z.string().min(1).max(5000),
  photo_url: z.string().url(),
  status: z.enum(["available", "unavailable", "open"]),
  timezone: z.string().min(1).max(100),
  years_experience: z.number().int().min(0).max(50),
  companies_count: z.number().int().min(0).max(100),
  countries_count: z.number().int().min(0).max(200),
  projects_count: z.number().int().min(0).max(1000),
  users_impacted: z.string().min(1).max(50),
  industries: z.array(z.string().min(1)).min(1),
  languages: z.array(z.string().min(1)).min(1),
});

export type AboutFormData = z.infer<typeof aboutSchema>;

export const aboutRowSchema = aboutSchema.extend({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type About = z.infer<typeof aboutRowSchema>;
