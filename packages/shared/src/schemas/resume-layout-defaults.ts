import type { ResumeLayoutFormData, VariantGuidelines } from "./resume-layout";

const NO_HALLUCINATION =
  "Only use actual experience from the resume. Never invent projects, employers, skills, metrics, or titles.";

const SHARED_SECTIONS = {
  personalInfo: true,
  summary: true,
  experience: true,
  education: true,
  skills: true,
  languages: true,
  remoteWorkExperience: true,
  references: true,
  projects: true,
  certifications: true,
} as const;

const SHARED_EMPHASIS: VariantGuidelines["contentEmphasis"] = {
  sectionPriority: {
    experience: 10,
    skills: 8,
    education: 5,
    projects: 6,
  },
  experienceStrategy: {
    highlightKeywords: true,
    reorderByRelevance: true,
    filterOutIrrelevant: true,
    maxBulletLines: 2,
  },
  skillsStrategy: {
    matchJobDescription: true,
    highlightRequired: true,
    filterByJobLevel: false,
    includeOnlyMatches: false,
  },
  summaryStrategy: {
    regenerateForJob: true,
    preserveGeneralBranding: true,
    maxSummaryLines: 4,
  },
};

const SHARED_AI_RULES: VariantGuidelines["aiTailoringRules"] = {
  tone: "professional",
  perspective: "achievement-focused",
  keywordMatching: true,
  bulletRewriting: true,
  noHallucination: NO_HALLUCINATION,
};

const CLASSIC_PROMPT = `You are a professional resume writer tailoring a resume for a specific job application.

GUIDELINES:
1. Only modify resume content using existing experience and skills from the provided resume data
2. Never invent projects, skills, metrics, employers, or experience not in the original resume
3. Always regenerate the professional summary so it is aimed at this job description. Keep identity (years, seniority, core stack). 2-4 sentences.
4. Reorder experience roles by relevance to the target job, then recency
5. Rewrite experience bullets for the JD: lead with achievement/impact, then method. 1-2 lines each.
6. Highlight (bold with **double asterisks**) technical keywords that match the job description
7. For skills: reorder to surface JD-required skills first. Do not invent skills.
8. If space-constrained, drop the least relevant roles and bullets rather than inventing filler
9. Preserve education and certifications
10. Tone: professional, achievement-focused, confident. No robotic phrasing.

TARGET JOB DESCRIPTION:
{jobDescription}

RESUME DATA:
{resumeData}

RETURN:
Modified ResumeData JSON matching the provided schema, tailored for the job description.`;

const MODERN_BLUE_PROMPT = `You are a professional resume writer tailoring a resume for a specific job application.

GUIDELINES:
1. Only modify resume content using existing experience and skills from the provided resume data
2. Never invent projects, skills, or experience not in the original resume
3. Always write a new full-width summary for this role (maximum 450 characters). Same person, same seniority, JD-aligned emphasis.
4. Select roles for relevance, then return them in reverse chronological order (newest first)
5. Highlight (bold with **double asterisks**) technical keywords that match the job description
6. For skills section: prioritize skills mentioned in the job description
7. Keep the summary within 450 characters and each bullet within 280 characters
8. Preserve accuracy - every claim must come from the original resume
9. Tone: Professional, achievement-focused, confident
10. This layout is a strict one-page A4 two-column resume. Respect the role limit and per-role bullet budgets in LAYOUT GUIDELINES.
11. Give the newest role the highest bullet count, taper bullets on each older role, and use only 1-2 bullets for roles at least 5 years old.
12. If content still exceeds one page, remove the oldest role rather than stripping recent roles of their strongest evidence.

TARGET JOB DESCRIPTION:
{jobDescription}

RESUME DATA:
{resumeData}

TAILORING RULES:
- Reorder bullets within each role by relevance, but keep roles newest-first
- Bold keywords matching the job description using **keyword**
- If space-constrained, remove bullets unrelated to the job
- Adjust summary so it significantly improves fit for this JD
- Keep all education and certification information
- Maintain factual accuracy at all times

RETURN:
Modified ResumeData JSON object with same structure as input, tailored for the job description.`;

export function classicGuidelines(): VariantGuidelines {
  return {
    formatting: {
      colorPalette: {
        primary: "#0f172a",
        body: "#1f2937",
        secondary: "#475569",
        subtle: "#64748b",
        accent: "#1e3a8a",
        rule: "#cbd5e1",
        band: "#f1f5f9",
        bg: "#ffffff",
      },
      typography: {
        headingFont: "Helvetica-Bold",
        bodyFont: "Helvetica",
        headingSizes: { name: 23, title: 11, section: 10.5, job: 10.5 },
        bodySizes: { contact: 9.5, body: 9.5, meta: 9 },
      },
      spacing: {
        pageMargins: "28pt top, 32pt bottom, 32pt horizontal",
        sectionGap: 13,
        jobGap: 6,
        bulletIndent: 10,
      },
      layout: {
        pageSize: "LETTER",
        columnLayout: "single",
        leftColumnWidth: 0,
        rightColumnWidth: 0,
        maxBulletsPerJob: 5,
        includeTagHighlighting: true,
      },
    },
    contentEmphasis: SHARED_EMPHASIS,
    aiTailoringPromptTemplate: CLASSIC_PROMPT,
    aiTailoringRules: SHARED_AI_RULES,
    validation: {
      minExperienceItems: 1,
      maxExperienceItems: 8,
      maxBulletsPerRole: 5,
      requireEducation: true,
      requireSummary: true,
      maxPageCount: 2,
      allowOverflow: "reduce-spacing",
    },
    sections: SHARED_SECTIONS,
    notes:
      "Classic single-column LETTER layout. Suited to most tech roles. Target two pages.",
  };
}

export function modernBlueGuidelines(): VariantGuidelines {
  return {
    formatting: {
      colorPalette: {
        primary: "#2C6EF2",
        ink: "#1A1A1A",
        gray: "#555550",
        pale: "#EEF3FE",
        rule: "#E5E0D8",
        bg: "#ffffff",
      },
      typography: {
        headingFont: "DM Serif Display",
        bodyFont: "DM Sans",
        headingSizes: { name: 21, title: 7.5, section: 6, job: 7.875 },
        bodySizes: { contact: 6, meta: 6.75, body: 7.125, tags: 6.375 },
      },
      spacing: {
        pageMargins: "10mm top, 8mm bottom, 11mm horizontal",
        sectionGap: 9,
        jobGap: 6.75,
        bulletIndent: 8.25,
      },
      layout: {
        pageSize: "A4",
        columnLayout: "twoColumn",
        leftColumnWidth: 377,
        rightColumnWidth: 144,
        maxBulletsPerJob: 5,
        includeTagHighlighting: true,
      },
    },
    contentEmphasis: {
      ...SHARED_EMPHASIS,
      summaryStrategy: {
        ...SHARED_EMPHASIS.summaryStrategy,
        maxSummaryLines: 5,
      },
    },
    aiTailoringPromptTemplate: MODERN_BLUE_PROMPT,
    aiTailoringRules: SHARED_AI_RULES,
    validation: {
      minExperienceItems: 3,
      maxExperienceItems: 8,
      maxBulletsPerRole: 5,
      requireEducation: true,
      requireSummary: true,
      maxPageCount: 1,
      allowOverflow: "reduce-spacing",
    },
    sections: {
      ...SHARED_SECTIONS,
      references: false,
      projects: false,
      certifications: false,
    },
    notes:
      "Modern Blue two-column A4. Visual hierarchy via color and type. Best for frontend, full-stack, and senior technical roles.",
  };
}

export function normalizeResumeLayoutGuidelines(
  componentKey: string,
  version: number,
  guidelines: VariantGuidelines,
): VariantGuidelines {
  if (componentKey !== "modern-blue" || version >= 4) return guidelines;
  const defaults = modernBlueGuidelines();
  if (version >= 2) {
    return {
      ...guidelines,
      aiTailoringPromptTemplate: defaults.aiTailoringPromptTemplate,
      validation: {
        ...guidelines.validation,
        minExperienceItems: defaults.validation.minExperienceItems,
        maxExperienceItems: defaults.validation.maxExperienceItems,
        maxPageCount: defaults.validation.maxPageCount,
        allowOverflow: defaults.validation.allowOverflow,
      },
    };
  }
  return {
    ...defaults,
    formatting: {
      ...defaults.formatting,
      colorPalette: {
        ...defaults.formatting.colorPalette,
        ...guidelines.formatting.colorPalette,
      },
    },
  };
}

export function classicLayoutForm(): ResumeLayoutFormData {
  return {
    name: "Classic",
    description: "Single-column LETTER resume with a slate header band.",
    version: 2,
    component_key: "classic",
    preview_image_url: null,
    is_default: true,
    notes: "Default public download layout.",
    guidelines: classicGuidelines(),
  };
}

export function modernBlueLayoutForm(): ResumeLayoutFormData {
  return {
    name: "Modern Blue",
    description: "Two-column A4 resume with blue hierarchy and a skills sidebar.",
    version: 4,
    component_key: "modern-blue",
    preview_image_url: null,
    is_default: false,
    notes: "Pixel-oriented Modern Blue variant.",
    guidelines: modernBlueGuidelines(),
  };
}

export function cloneLayoutForm(
  source: ResumeLayoutFormData,
  overrides: Partial<
    Pick<ResumeLayoutFormData, "name" | "description" | "component_key">
  >,
): ResumeLayoutFormData {
  return {
    ...source,
    name: overrides.name ?? `${source.name} copy`,
    description: overrides.description ?? source.description,
    component_key: overrides.component_key ?? source.component_key,
    is_default: false,
    preview_image_url: null,
    version: 1,
    guidelines: JSON.parse(JSON.stringify(source.guidelines)) as VariantGuidelines,
  };
}
