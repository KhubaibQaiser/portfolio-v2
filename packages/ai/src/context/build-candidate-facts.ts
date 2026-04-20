/**
 * Pure function: turns already-loaded Supabase rows into a compact
 * Markdown "fact sheet" the LLM sees, plus a stable idMap used by the
 * fabrication guardrail.
 *
 * Keeping this pure (no DB, no React, no Next) is deliberate so both
 * apps call the same function with data they already have.
 */

export type FactsInputExperience = {
  id: string;
  company: string;
  role: string;
  location: string;
  location_type: string;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  description: string;
  tech_tags: string[];
};

export type FactsInputSkill = {
  category: string;
  name: string;
};

export type FactsInputEducation = {
  degree: string;
  institution: string;
  year: string;
};

export type FactsInputCertification = {
  name: string;
  issuer: string;
};

export type FactsInputSiteConfig = {
  name: string;
  title: string;
  email: string;
  location: string;
  social_links: Array<{ platform: string; url: string; label?: string }>;
};

export type FactsInputResume = {
  default_summary: string;
  education: FactsInputEducation[];
  certifications: FactsInputCertification[];
  voice_sample?: string | null;
};

export type BuildCandidateFactsInput = {
  siteConfig: FactsInputSiteConfig;
  resume: FactsInputResume;
  experiences: FactsInputExperience[];
  skills: FactsInputSkill[];
  about?: {
    years_experience?: number | null;
    industries?: string[] | null;
  };
};

export type CandidateIdMap = {
  experiences: Record<
    string,
    { id: string; stableId: string; bullets: string[] }
  >;
  skillCategories: string[];
};

export type CandidateFacts = {
  factSheet: string;
  idMap: CandidateIdMap;
  voiceSample: string | null;
};

/** Split a description textarea into bullet lines. */
function splitBullets(description: string): string[] {
  return description
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function groupSkills(skills: FactsInputSkill[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const s of skills) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category]!.push(s.name);
  }
  return grouped;
}

function renderPeriod(start: string, end: string | null): string {
  return `${start} – ${end ?? "Present"}`;
}

export function buildCandidateFacts(
  input: BuildCandidateFactsInput,
): CandidateFacts {
  const { siteConfig, resume, experiences, skills, about } = input;

  const idMap: CandidateIdMap = {
    experiences: {},
    skillCategories: [],
  };

  const socialLine = siteConfig.social_links
    .filter((l) => ["linkedin", "github", "twitter", "x"].includes(l.platform))
    .map((l) => `${l.platform}: ${l.url}`)
    .join(" | ");

  const expBlocks: string[] = [];
  experiences.forEach((exp, i) => {
    const stableId = `e${i + 1}`;
    const bullets = splitBullets(exp.description);
    idMap.experiences[stableId] = {
      id: exp.id,
      stableId,
      bullets,
    };

    const bulletLines = bullets
      .map((b, bi) => `  [b${bi}] ${b}`)
      .join("\n");

    const tech = exp.tech_tags.slice(0, 16).join(", ");

    expBlocks.push(
      `[${stableId}] ${exp.role} @ ${exp.company} | ${renderPeriod(
        exp.start_date,
        exp.end_date,
      )} | ${exp.location} (${exp.location_type})\n${bulletLines}\n  tech: ${tech}`,
    );
  });

  const grouped = groupSkills(skills);
  idMap.skillCategories = Object.keys(grouped);
  const skillBlock = Object.entries(grouped)
    .map(([cat, items]) => `${cat}: ${items.slice(0, 16).join(", ")}`)
    .join("\n");

  const eduBlock =
    resume.education.length > 0
      ? resume.education
          .map((e) => `- ${e.degree}, ${e.institution} (${e.year})`)
          .join("\n")
      : "(none)";

  const certBlock =
    resume.certifications.length > 0
      ? resume.certifications
          .map((c) => `- ${c.name}${c.issuer ? ` (${c.issuer})` : ""}`)
          .join("\n")
      : "(none)";

  const industries =
    about?.industries && about.industries.length > 0
      ? about.industries.join(", ")
      : "(unspecified)";

  const yoe = about?.years_experience ?? "(unspecified)";

  const voiceSample = (resume.voice_sample ?? "").trim() || null;
  const voiceBlock = voiceSample
    ? `# VOICE SAMPLE (match register, cadence, and word choice)\n"""\n${voiceSample}\n"""`
    : "# VOICE SAMPLE\n(none provided; use neutral-but-warm professional English)";

  const factSheet =
    `# CANDIDATE\n` +
    `${siteConfig.name} | ${siteConfig.title} | ${siteConfig.location}\n` +
    `Email: ${siteConfig.email}\n` +
    (socialLine ? `${socialLine}\n` : "") +
    `YOE: ${yoe} | Industries: ${industries}\n\n` +
    `Base summary: ${resume.default_summary.trim()}\n\n` +
    `# EXPERIENCE (rewrite-only; reference bullets by {experienceId, sourceBulletIndex})\n` +
    `${expBlocks.join("\n\n")}\n\n` +
    `# SKILLS\n${skillBlock}\n\n` +
    `# EDUCATION\n${eduBlock}\n\n` +
    `# CERTIFICATIONS\n${certBlock}\n\n` +
    `${voiceBlock}\n`;

  return { factSheet, idMap, voiceSample };
}
