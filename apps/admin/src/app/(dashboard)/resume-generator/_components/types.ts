import type { TailoredResume, CoverLetter, AtsScore } from "@portfolio/ai/schemas";

export type HistoryItem = {
  id: string;
  createdAt: string;
  company: string | null;
  role: string | null;
  model: string;
  fallbackUsed: boolean;
  hasResume: boolean;
  hasCoverLetter: boolean;
  hasAts: boolean;
  layoutId: string | null;
};

export type GenKind = "resume" | "cover_letter" | "both";

export type OptionsState = {
  company: string;
  role: string;
  hiringManager: string;
};

export type GenerationState = {
  resume: TailoredResume | null;
  coverLetter: CoverLetter | null;
  ats: AtsScore | null;
};
