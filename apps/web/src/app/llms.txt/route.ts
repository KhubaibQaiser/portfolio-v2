import {
  fetchAbout,
  fetchAllProjects,
  fetchExperience,
  fetchSiteConfig,
  fetchSkills,
} from "@/lib/data";
import { SITE_URL } from "@/lib/seo";
import { uniqueCompanyCount } from "@portfolio/shared/experience-stats";

export const revalidate = 3600;

/** Keeps AI-crawler-facing bullets terse even when a CMS description is long. */
function firstSentence(text: string, maxLength = 140): string {
  const sentence = text.split(/(?<=[.!?])\s/)[0] ?? text;
  return sentence.length > maxLength ? `${sentence.slice(0, maxLength - 1)}…` : sentence;
}

export async function GET() {
  const [config, about, skills, experience, projects] = await Promise.all([
    fetchSiteConfig(),
    fetchAbout(),
    fetchSkills(),
    fetchExperience(),
    fetchAllProjects(),
  ]);

  const companiesCount = uniqueCompanyCount(experience);
  const specializations = skills.map((s) => s.name).join(", ");
  const experienceLines = experience
    .map(
      (e) =>
        `- ${e.role} at ${e.company}${e.end_date ? "" : " (current)"}: ${firstSentence(e.description)}`,
    )
    .join("\n");

  const body = `# ${config.name} — ${config.title}

> ${config.description}

## Key Pages

- [Home](${SITE_URL}): Background, skills, and experience overview
- [Projects](${SITE_URL}/projects): ${projects.length}+ web, mobile, and game projects with case studies
- [Resume](${SITE_URL}/resume): Downloadable resume
- [Contact](${SITE_URL}/#contact): Reach out for opportunities

## Specializations

${specializations}

## Experience Highlights

${experienceLines}
- ${about.years_experience}+ years across ${companiesCount} companies and ${about.countries_count} countries

## More

Full project list, skills, and experience detail: ${SITE_URL}/llms-full.txt
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
