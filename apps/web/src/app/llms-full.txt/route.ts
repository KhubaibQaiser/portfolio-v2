import {
  fetchAbout,
  fetchAllProjects,
  fetchExperience,
  fetchSiteConfig,
  fetchSkills,
} from "@/lib/data";
import { SITE_URL } from "@/lib/seo";
import { SKILL_CATEGORIES } from "@portfolio/shared/constants";

export const revalidate = 3600;

export async function GET() {
  const [config, about, skills, experience, projects] = await Promise.all([
    fetchSiteConfig(),
    fetchAbout(),
    fetchSkills(),
    fetchExperience(),
    fetchAllProjects(),
  ]);

  const skillLines = skills
    .map(
      (s) =>
        `- ${s.name} (${SKILL_CATEGORIES[s.category] ?? s.category}, ${s.years}+ years)`,
    )
    .join("\n");

  const experienceLines = experience
    .map(
      (e) =>
        `### ${e.role} at ${e.company} (${e.start_date} – ${e.end_date ?? "Present"})\n${e.description}\nTech: ${e.tech_tags.join(", ")}`,
    )
    .join("\n\n");

  const projectLines = projects
    .map(
      (p) =>
        `### ${p.title}\n${p.description}\nRole: ${p.role} · Type: ${p.type}\nTech: ${p.tech_tags.join(", ")}\nURL: ${SITE_URL}/projects/${p.slug}`,
    )
    .join("\n\n");

  const body = `# ${config.name} — ${config.title} (Full Profile)

${about.bio}

Location: ${config.location}
Contact: ${config.email}

## Skills

${skillLines}

## Experience

${experienceLines}

## Projects

${projectLines}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
