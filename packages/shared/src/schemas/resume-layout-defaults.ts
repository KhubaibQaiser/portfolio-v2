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
3. Always write a new summary for this role (3-4 sentences max). Same person, same seniority, JD-aligned emphasis.
4. Reorder experience bullets to prioritize relevance to the target job
5. Highlight (bold with **double asterisks**) technical keywords that match the job description
6. For skills section: prioritize skills mentioned in the job description
7. Keep summaries to 3-4 sentences
8. Preserve accuracy - every claim must come from the original resume
9. Tone: Professional, achievement-focused, confident
10. This layout is a one-page A4 two-column resume. Prefer 3-6 roles, max 5 bullets per role, tight wording.

TARGET JOB DESCRIPTION:
{jobDescription}

RESUME DATA:
{resumeData}

TAILORING RULES:
- Reorder experience bullets by relevance (most relevant first)
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
        bodyFont: "Helvetica",
        headingSizes: { name: 28, title: 7.5, section: 6.5, job: 8.5 },
        bodySizes: { contact: 9, meta: 7.5, body: 8, tags: 7.5 },
      },
      spacing: {
        pageMargins: "12mm top, 10mm bottom, 13mm left, 13mm right",
        sectionGap: 12,
        jobGap: 9,
        bulletIndent: 11,
      },
      layout: {
        pageSize: "A4",
        columnLayout: "twoColumn",
        leftColumnWidth: 385,
        rightColumnWidth: 130,
        maxBulletsPerJob: 5,
        includeTagHighlighting: true,
      },
    },
    contentEmphasis: SHARED_EMPHASIS,
    aiTailoringPromptTemplate: MODERN_BLUE_PROMPT,
    aiTailoringRules: SHARED_AI_RULES,
    validation: {
      minExperienceItems: 1,
      maxExperienceItems: 8,
      maxBulletsPerRole: 5,
      requireEducation: true,
      requireSummary: true,
      maxPageCount: 1,
      allowOverflow: "reduce-spacing",
    },
    sections: SHARED_SECTIONS,
    notes:
      "Modern Blue two-column A4. Visual hierarchy via color and type. Best for frontend, full-stack, and senior technical roles.",
  };
}

export function classicLayoutForm(): ResumeLayoutFormData {
  return {
    name: "Classic",
    description: "Single-column LETTER resume with a slate header band.",
    version: 1,
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
    version: 1,
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
