import { z } from "zod";

/** A "Why hire me" differentiator card rendered on the public site. */
export const highlightSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(400),
});

export type Highlight = z.infer<typeof highlightSchema>;

export const aboutSchema = z.object({
  bio: z.string().min(1).max(5000),
  photo_url: z.string().url(),
  status: z.enum(["available", "unavailable", "open"]),
  timezone: z.string().min(1).max(100),
  years_experience: z.number().int().min(0).max(50),
  // `companies_count` intentionally omitted: it is derived from the Experience
  // table at read time (see `uniqueCompanyCount`) so it can never drift.
  countries_count: z.number().int().min(0).max(200),
  projects_count: z.number().int().min(0).max(1000),
  users_impacted: z.string().min(1).max(50),
  industries: z.array(z.string().min(1)).min(1),
  languages: z.array(z.string().min(1)).min(1),
  /** "Why hire me" cards. Managed in the admin; rendered on the home page. */
  highlights: z.array(highlightSchema),
});

export type AboutFormData = z.infer<typeof aboutSchema>;

export const aboutRowSchema = aboutSchema.extend({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  revision: z.number().int().min(1).default(1),
});

export type About = z.infer<typeof aboutRowSchema>;
