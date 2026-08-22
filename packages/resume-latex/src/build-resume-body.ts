import type { ResumeData } from "@portfolio/shared/resume-data";
import { escapeLatex, stripMarkdownBold } from "./escape-latex";
import { formatEmploymentPeriod } from "./format-dates";

const SECTION_SUMMARY = "Professional Summary";
const SECTION_SKILLS = "Technical Skills";
const SECTION_EXPERIENCE = "Professional Experience";
const SECTION_EDUCATION = "Education";
const SECTION_LANGUAGES = "Languages";
const SECTION_PROJECTS = "Personal Projects";

function plainUrl(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function hrefPair(url: string, label?: string): string {
  const href = url.startsWith("http") ? url : `https://${url}`;
  const visible = escapeLatex(label ?? plainUrl(url));
  return `\\href{${href}}{${visible}}`;
}

function buildContactLine(data: ResumeData): string {
  const segments: string[] = [escapeLatex(data.location)];
  if (data.phone?.trim()) {
    segments.push(escapeLatex(data.phone.trim()));
  }
  segments.push(hrefPair(`mailto:${data.email}`, data.email));
  segments.push(hrefPair(data.website, plainUrl(data.website)));

  const github = data.socialLinks.find((l) => l.platform === "github");
  if (github?.url) {
    segments.push(hrefPair(github.url, plainUrl(github.label || github.url)));
  }
  const linkedin = data.socialLinks.find((l) => l.platform === "linkedin");
  if (linkedin?.url) {
    segments.push(hrefPair(linkedin.url, plainUrl(linkedin.label || linkedin.url)));
  }

  return segments.join(" \\textbar\\ ");
}

function buildSkillsSection(data: ResumeData): string {
  return data.skills
    .map(
      (group) =>
        `\\skillsline{${escapeLatex(group.category)}}{${escapeLatex(group.items.join(", "))}}`,
    )
    .join("\n");
}

function buildExperienceSection(data: ResumeData): string {
  return data.experience
    .map((exp) => {
      const meta = [
        escapeLatex(exp.company),
        escapeLatex(exp.location),
        escapeLatex(formatEmploymentPeriod(exp.period)),
      ].join(" \\textbar\\ ");
      const bullets = exp.bullets
        .map((b) => `\\item ${escapeLatex(stripMarkdownBold(b))}`)
        .join("\n");
      return [
        "\\begin{roleblock}",
        `\\roletitle{${escapeLatex(exp.role)}}`,
        `\\rolemeta{${meta}}`,
        "\\begin{resumebullets}",
        bullets,
        "\\end{resumebullets}",
        "\\end{roleblock}",
      ].join("\n");
    })
    .join("\n\n");
}

function buildEducationSection(data: ResumeData): string {
  return data.education
    .map((edu) => {
      const school = `${escapeLatex(edu.institution)} \\textbar\\ ${escapeLatex(edu.year)}`;
      return `\\eduline{${escapeLatex(edu.degree)}}\n\\eduschool{${school}}`;
    })
    .join("\n\n");
}

function buildLanguagesSection(data: ResumeData): string {
  if (data.languages.length === 0) return "";
  const line = data.languages
    .map((l) => `${escapeLatex(l.name)} (${escapeLatex(l.level)})`)
    .join(" \\textbar\\ ");
  return `\\langline{${line}}`;
}

function buildProjectsSection(data: ResumeData): string {
  if (data.projects.length === 0) return "";
  const blocks = data.projects.map((project) => {
    const bullets = project.bullets
      .map((b) => `\\item ${escapeLatex(stripMarkdownBold(b))}`)
      .join("\n");
    const title = project.status
      ? `${escapeLatex(project.name)} (${escapeLatex(project.status)})`
      : escapeLatex(project.name);
    return [
      "\\begin{roleblock}",
      `\\roletitle{${title}}`,
      "\\begin{resumebullets}",
      bullets,
      "\\end{resumebullets}",
      "\\end{roleblock}",
    ].join("\n");
  });
  return [
    `\\sectionheading{${SECTION_PROJECTS}}`,
    blocks.join("\n\n"),
  ].join("\n");
}

/** Build LaTeX document body (between \\begin{document} and \\end{document}). */
export function buildResumeBody(data: ResumeData, includeProjects = false): string {
  const summary = escapeLatex(stripMarkdownBold(data.summary));
  const languages = buildLanguagesSection(data);
  const projects =
    includeProjects && data.projects.length > 0 ? buildProjectsSection(data) : "";

  return [
    `\\resumename{${escapeLatex(data.name)}}`,
    `\\resumetitle{${escapeLatex(data.title)}}`,
    `\\resumecontact{${buildContactLine(data)}}`,
    "\\resumehrule",
    "",
    `\\sectionheadingfirst{${SECTION_SUMMARY}}`,
    `\\resumesummary{${summary}}`,
    "",
    `\\sectionheading{${SECTION_SKILLS}}`,
    buildSkillsSection(data),
    "",
    `\\sectionheading{${SECTION_EXPERIENCE}}`,
    buildExperienceSection(data),
    "",
    `\\sectionheading{${SECTION_EDUCATION}}`,
    buildEducationSection(data),
    "",
    languages ? `\\sectionheading{${SECTION_LANGUAGES}}\n${languages}` : "",
    projects ? `\n${projects}` : "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}
