import { z } from "zod";

export const workArrangementEnum = z.enum(["remote", "hybrid", "onsite"]);
export type WorkArrangement = z.infer<typeof workArrangementEnum>;

export const employmentTypePrefEnum = z.enum([
  "full_time",
  "contract",
  "part_time",
  "internship",
]);
export type EmploymentTypePref = z.infer<typeof employmentTypePrefEnum>;

export const visaRelocationEnum = z.enum(["required", "optional", "exclude"]);
export type VisaRelocationPref = z.infer<typeof visaRelocationEnum>;

export const jobPreferencesSchema = z
  .object({
    title_families: z.array(z.string().min(1).max(80)).max(20),
    seniority_bands: z.array(z.string().min(1).max(40)).max(12),
    work_arrangements: z.array(workArrangementEnum).min(1).max(3),
    location_allow: z.array(z.string().min(1).max(80)).max(20),
    location_deny: z.array(z.string().min(1).max(80)).max(20),
    salary_floor: z.number().int().nonnegative().nullable().default(null),
    salary_currency: z.string().min(1).max(8),
    employment_types: z.array(employmentTypePrefEnum).min(1).max(4),
    visa_relocation: visaRelocationEnum,
    keyword_include: z.array(z.string().min(1).max(80)).max(40),
    keyword_exclude: z.array(z.string().min(1).max(80)).max(40),
    recency_days: z.number().int().min(1).max(30),
    notify_threshold: z.number().int().min(0).max(100),
    digest_threshold: z.number().int().min(0).max(100),
    // Dynamo `writable()` omits nulls, so these come back as missing attributes
    // (`undefined`), not JSON `null`. `.default(null)` maps that to the domain.
    recommended_job_id: z.string().min(1).max(64).nullable().default(null),
    jobspipe_last_search_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .default(null),
    default_layout_id: z.string().min(1).max(80).nullable().default(null),
  })
  .strict();

export type JobPreferencesFormData = z.infer<typeof jobPreferencesSchema>;

export const jobPreferencesRowSchema = jobPreferencesSchema.extend({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  revision: z.number().int().min(1).default(1),
});

export type JobPreferences = z.infer<typeof jobPreferencesRowSchema>;

export const DEFAULT_JOB_PREFERENCES: JobPreferencesFormData = {
  title_families: [
    "staff software engineer",
    "senior software engineer",
    "senior fullstack engineer",
  ],
  seniority_bands: ["staff", "senior", "principal"],
  work_arrangements: ["remote", "hybrid"],
  location_allow: [],
  location_deny: [],
  salary_floor: null,
  salary_currency: "USD",
  employment_types: ["full_time"],
  visa_relocation: "optional",
  keyword_include: [],
  keyword_exclude: ["unpaid intern"],
  recency_days: 7,
  notify_threshold: 85,
  digest_threshold: 70,
  recommended_job_id: null,
  jobspipe_last_search_date: null,
  default_layout_id: null,
};

export function defaultJobPreferencesRow(): JobPreferences {
  const timestamp = new Date(0).toISOString();
  return {
    ...DEFAULT_JOB_PREFERENCES,
    id: "job-preferences",
    created_at: timestamp,
    updated_at: timestamp,
    revision: 1,
  };
}
