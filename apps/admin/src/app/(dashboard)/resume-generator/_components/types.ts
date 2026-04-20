import type {
  TailoredResume,
  CoverLetter,
  AtsScore,
} from "@portfolio/ai/schemas";

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
};

export type GenKind = "resume" | "cover_letter" | "both";

export type Tone = "formal" | "friendly" | "enthusiastic";
export type Length = "short" | "standard" | "detailed";
export type Language = "en" | "de" | "fr";

export type OptionsState = {
  company: string;
  role: string;
  hiringManager: string;
  tone: Tone | "";
  length: Length | "";
  language: Language;
};

export type GenerationState = {
  resume: TailoredResume | null;
  coverLetter: CoverLetter | null;
  ats: AtsScore | null;
};
