import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildResumeBody } from "./build-resume-body";

function moduleDirTemplatePath(): string | null {
  try {
    const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
    return join(packageRoot, "templates", "resume_template.tex");
  } catch {
    return null;
  }
}

function templateCandidates(): string[] {
  const cwd = process.cwd();
  const fileName = "resume_template.tex";
  return [
    moduleDirTemplatePath(),
    join(cwd, "resume-latex/templates", fileName),
    join(cwd, "packages/resume-latex/templates", fileName),
  ].filter((candidate): candidate is string => candidate !== null);
}

export function getTemplatePath(): string {
  const resolved = templateCandidates().find((candidate) => existsSync(candidate));
  if (!resolved) {
    throw new Error(
      "resume_template.tex not found. Install @portfolio/resume-latex templates or set cwd to monorepo root.",
    );
  }
  return resolved;
}

/** Assemble full .tex source: locked preamble + dynamic body. */
export function assembleResumeDocument(body: string): string {
  const full = readFileSync(getTemplatePath(), "utf8");
  const beginMarker = "\\begin{document}";
  const endMarker = "\\end{document}";
  const beginIdx = full.indexOf(beginMarker);
  const endIdx = full.indexOf(endMarker);
  if (beginIdx < 0 || endIdx < 0) {
    throw new Error("resume_template.tex must contain \\begin{document} and \\end{document}");
  }
  const preamble = full.slice(0, beginIdx);
  return `${preamble}${beginMarker}\n\\pagestyle{empty}\n\n${body}\n\n${endMarker}\n`;
}

export function readVendoredReferenceDocument(): string {
  return readFileSync(getTemplatePath(), "utf8");
}

export function assembleResumeDocumentFromData(
  data: Parameters<typeof buildResumeBody>[0],
  includeProjects?: boolean,
): string {
  return assembleResumeDocument(buildResumeBody(data, includeProjects));
}
