import { z } from "zod";

export const resumeLayoutComponentKeyEnum = z.enum(["classic", "modern-blue"]);
export type ResumeLayoutComponentKey = z.infer<typeof resumeLayoutComponentKeyEnum>;

export const resumeLayoutPageSizeEnum = z.enum(["A4", "LETTER"]);
export const resumeLayoutColumnEnum = z.enum(["single", "twoColumn"]);
export const resumeLayoutOverflowEnum = z.enum(["truncate", "reduce-spacing", "error"]);
export const resumeLayoutToneEnum = z.enum([
  "professional",
  "conversational",
  "technical",
]);
export const resumeLayoutPerspectiveEnum = z.enum([
  "achievement-focused",
  "impact-focused",
  "skill-focused",
]);

export const resumeLayoutFormattingSchema = z.object({
  colorPalette: z.record(z.string(), z.string()),
  typography: z.object({
    headingFont: z.string().min(1),
    bodyFont: z.string().min(1),
    headingSizes: z.record(z.string(), z.number()),
    bodySizes: z.record(z.string(), z.number()),
  }),
  spacing: z.object({
    pageMargins: z.string().min(1),
    sectionGap: z.number(),
    jobGap: z.number(),
    bulletIndent: z.number(),
  }),
  layout: z.object({
    pageSize: resumeLayoutPageSizeEnum,
    columnLayout: resumeLayoutColumnEnum,
    leftColumnWidth: z.number(),
    rightColumnWidth: z.number(),
    maxBulletsPerJob: z.number().int().min(1).max(12),
    includeTagHighlighting: z.boolean(),
  }),
});

export const resumeLayoutContentEmphasisSchema = z.object({
  sectionPriority: z.object({
    experience: z.number().min(1).max(10),
    skills: z.number().min(1).max(10),
    education: z.number().min(1).max(10),
    projects: z.number().min(1).max(10).optional(),
  }),
  experienceStrategy: z.object({
    highlightKeywords: z.boolean(),
    reorderByRelevance: z.boolean(),
    filterOutIrrelevant: z.boolean(),
    maxBulletLines: z.number().int().min(1).max(6),
  }),
  skillsStrategy: z.object({
    matchJobDescription: z.boolean(),
    highlightRequired: z.boolean(),
    filterByJobLevel: z.boolean(),
    includeOnlyMatches: z.boolean(),
  }),
  summaryStrategy: z.object({
    regenerateForJob: z.boolean(),
    preserveGeneralBranding: z.boolean(),
    maxSummaryLines: z.number().int().min(1).max(8),
  }),
});

export const resumeLayoutAiTailoringRulesSchema = z.object({
  tone: resumeLayoutToneEnum,
  perspective: resumeLayoutPerspectiveEnum,
  keywordMatching: z.boolean(),
  bulletRewriting: z.boolean(),
  noHallucination: z.string().min(1),
});

export const resumeLayoutValidationSchema = z.object({
  minExperienceItems: z.number().int().min(1),
  maxExperienceItems: z.number().int().min(1).max(20),
  maxBulletsPerRole: z.number().int().min(1).max(10),
  requireEducation: z.boolean(),
  requireSummary: z.boolean(),
  maxPageCount: z.number().int().min(1).max(4),
  allowOverflow: resumeLayoutOverflowEnum,
});

export const resumeLayoutSectionsSchema = z.object({
  personalInfo: z.boolean(),
  summary: z.boolean(),
  experience: z.boolean(),
  education: z.boolean(),
  skills: z.boolean(),
  languages: z.boolean(),
  remoteWorkExperience: z.boolean(),
  references: z.boolean(),
  projects: z.boolean(),
  certifications: z.boolean(),
});

export const variantGuidelinesSchema = z.object({
  formatting: resumeLayoutFormattingSchema,
  contentEmphasis: resumeLayoutContentEmphasisSchema,
  aiTailoringPromptTemplate: z.string().min(1),
  aiTailoringRules: resumeLayoutAiTailoringRulesSchema,
  validation: resumeLayoutValidationSchema,
  sections: resumeLayoutSectionsSchema,
  notes: z.string(),
});

export type VariantGuidelines = z.infer<typeof variantGuidelinesSchema>;

export const resumeLayoutSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  version: z.number().int().min(1),
  component_key: resumeLayoutComponentKeyEnum,
  preview_image_url: z.string().url().nullable(),
  is_default: z.boolean(),
  notes: z.string().max(2000),
  guidelines: variantGuidelinesSchema,
});

export type ResumeLayoutFormData = z.infer<typeof resumeLayoutSchema>;

export const resumeLayoutRowSchema = resumeLayoutSchema.extend({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ResumeLayout = z.infer<typeof resumeLayoutRowSchema>;

export const CLASSIC_LAYOUT_ID = "layout-classic";
export const MODERN_BLUE_LAYOUT_ID = "layout-modern-blue";

export function pickDefaultResumeLayout(layouts: ResumeLayout[]): ResumeLayout | null {
  if (layouts.length === 0) return null;
  return layouts.find((layout) => layout.is_default) ?? layouts[0] ?? null;
}
