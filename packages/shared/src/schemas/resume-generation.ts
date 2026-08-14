import { z } from "zod";

export const resumeGenLanguageEnum = z.enum(["en", "de", "fr"]);
export const resumeGenToneEnum = z.enum(["formal", "friendly", "enthusiastic"]);
export const resumeGenLengthEnum = z.enum(["short", "standard", "detailed"]);
export const resumeGenSourceEnum = z.enum(["paste", "pdf"]);

export type ResumeGenLanguage = z.infer<typeof resumeGenLanguageEnum>;
export type ResumeGenTone = z.infer<typeof resumeGenToneEnum>;
export type ResumeGenLength = z.infer<typeof resumeGenLengthEnum>;
export type ResumeGenSource = z.infer<typeof resumeGenSourceEnum>;

/**
 * Token + cost accounting captured for a single generation run.
 * `costUsd` drives the daily/monthly spend cap.
 */
export type ResumeGenerationUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  costUsd?: number;
  latencyMs?: number;
  fallbackUsed?: boolean;
  model?: string;
};

/**
 * A persisted resume/cover-letter generation record. The AI payloads
 * (`resume`, `cover_letter`, `ats`) are kept structurally open here so the
 * shared package stays decoupled from the AI package's output schemas; the
 * admin layer narrows them with the relevant Zod validators on read.
 */
export type ResumeGeneration = {
  id: string;
  created_by: string;
  company: string | null;
  role: string | null;
  hiring_manager: string | null;
  language: ResumeGenLanguage;
  tone: ResumeGenTone | null;
  length: ResumeGenLength | null;
  jd_text: string;
  jd_source: ResumeGenSource;
  jd_pdf_url: string | null;
  model: string;
  fallback_used: boolean;
  resume: Record<string, unknown> | null;
  cover_letter: Record<string, unknown> | null;
  ats: Record<string, unknown> | null;
  usage: ResumeGenerationUsage | null;
  resume_pdf_url: string | null;
  cover_letter_pdf_url: string | null;
  layout_id: string | null;
  applied_changes: string[];
  archived_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ResumeGenerationInsert = Omit<
  ResumeGeneration,
  "id" | "created_at" | "updated_at"
>;

export type ResumeGenerationUpdate = Partial<ResumeGenerationInsert>;
