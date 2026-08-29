import { z } from "zod";

export const jobSourceEnum = z.enum([
  "remotive",
  "remoteok",
  "arbeitnow",
  "themuse",
  "wwr",
  "jobspipe",
]);
export type JobSource = z.infer<typeof jobSourceEnum>;

export const jobStatusEnum = z.enum([
  "new",
  "reviewing",
  "applied",
  "discarded",
  "snoozed",
  "closed",
]);
export type JobStatus = z.infer<typeof jobStatusEnum>;

export const jobBandEnum = z.enum([
  "excellent",
  "strong",
  "moderate",
  "weak",
  "filtered",
]);
export type JobBand = z.infer<typeof jobBandEnum>;

export const jobSourceRefSchema = z
  .object({
    source: jobSourceEnum,
    source_id: z.string().min(1).max(200),
    apply_url: z.string().url().max(2000),
  })
  .strict();
export type JobSourceRef = z.infer<typeof jobSourceRefSchema>;

export const jobPostingRowSchema = z
  .object({
    id: z.string().min(1).max(64),
    natural_key: z.string().min(1).max(64),
    company: z.string().min(1).max(200),
    company_domain: z.string().max(200).nullable(),
    title: z.string().min(1).max(300),
    location: z.string().max(200),
    remote: z.boolean(),
    salary_min: z.number().int().nonnegative().nullable(),
    salary_max: z.number().int().nonnegative().nullable(),
    salary_currency: z.string().max(8).nullable(),
    jd_text: z.string().max(20_000),
    sources: z.array(jobSourceRefSchema).min(1).max(12),
    score: z.number().int().min(0).max(100),
    band: jobBandEnum,
    gaps: z.array(z.string().max(200)).max(20),
    status: jobStatusEnum,
    posted_at: z.string().min(1).max(40),
    ingested_at: z.string().min(1).max(40),
    notified_at: z.string().max(40).nullable(),
    digested_at: z.string().max(40).nullable(),
    follow_up_at: z.string().max(40).nullable(),
    snooze_count: z.number().int().nonnegative(),
    generation_id: z.string().max(80).nullable(),
    recruiter_message: z.string().max(800).nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .strict();

export type JobPosting = z.infer<typeof jobPostingRowSchema>;

export function bandForScore(score: number): JobBand {
  if (score >= 90) return "excellent";
  if (score >= 75) return "strong";
  if (score >= 60) return "moderate";
  if (score > 0) return "weak";
  return "filtered";
}

export const HITL_STATUSES: ReadonlySet<JobStatus> = new Set([
  "reviewing",
  "applied",
  "discarded",
  "snoozed",
  "closed",
]);
