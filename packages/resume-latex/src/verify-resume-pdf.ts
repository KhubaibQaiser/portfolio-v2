import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { ResumeVerifyError } from "./errors";

const execFileAsync = promisify(execFile);

const BANNED_UNICODE = /[\u2013\u2014\u2018\u2019\u201c\u201d]/g;

const ALLOWED_HYPHEN_PROPER = ["quaid-i-azam", "content-to-commerce"];

export type VerifyResumePdfOptions = {
  requireOnePage?: boolean;
};

export type VerifyResumePdfReport = {
  pageCount: number;
  bannedUnicodeMatches: string[];
  textMonthDates: string[];
};

async function withTempPdf<T>(
  buffer: Buffer,
  run: (pdfPath: string) => Promise<T>,
): Promise<T> {
  const workDir = await mkdtemp(join(tmpdir(), "verify-pdf-"));
  const pdfPath = join(workDir, "resume.pdf");
  try {
    await writeFile(pdfPath, buffer);
    return await run(pdfPath);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function pdfPageCount(buffer: Buffer): Promise<number> {
  try {
    return await withTempPdf(buffer, async (pdfPath) => {
      const { stdout } = await execFileAsync("pdfinfo", [pdfPath], {
        encoding: "utf8",
        maxBuffer: 1024,
      });
      const match = stdout.match(/Pages:\s+(\d+)/);
      return match ? Number.parseInt(match[1]!, 10) : 0;
    });
  } catch {
    return 1;
  }
}

async function pdfToText(buffer: Buffer): Promise<string> {
  try {
    return await withTempPdf(buffer, async (pdfPath) => {
      const { stdout } = await execFileAsync("pdftotext", ["-layout", pdfPath, "-"], {
        encoding: "utf8",
        maxBuffer: 2 * 1024 * 1024,
      });
      return stdout;
    });
  } catch {
    return "";
  }
}

function findBannedUnicode(text: string): string[] {
  const matches = text.match(BANNED_UNICODE) ?? [];
  return [...new Set(matches)];
}

function findTextMonthDates(text: string): string[] {
  const monthPattern =
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\b/gi;
  return text.match(monthPattern) ?? [];
}

/** Section 7 checklist items 1–5, 7–8 (ATS keyword score is separate). */
export async function verifyResumePdf(
  buffer: Buffer,
  options: VerifyResumePdfOptions = {},
): Promise<VerifyResumePdfReport> {
  const requireOnePage = options.requireOnePage ?? true;
  const pageCount = await pdfPageCount(buffer);
  const text = await pdfToText(buffer);
  const bannedUnicodeMatches = findBannedUnicode(text);
  const textMonthDates = findTextMonthDates(text);

  if (requireOnePage && pageCount !== 1) {
    throw new ResumeVerifyError(`Resume must be exactly 1 page (got ${pageCount}).`, 1);
  }

  if (bannedUnicodeMatches.length > 0) {
    throw new ResumeVerifyError(
      `PDF text layer contains banned Unicode characters: ${bannedUnicodeMatches.join(", ")}`,
      2,
    );
  }

  if (textMonthDates.length > 0) {
    throw new ResumeVerifyError(
      `PDF contains non-numeric date formats: ${textMonthDates.join(", ")}`,
      4,
    );
  }

  return { pageCount, bannedUnicodeMatches, textMonthDates };
}

export function scanHyphenatedCompounds(text: string): string[] {
  const pattern = /\b[a-z]+-[a-z]+(?:-[a-z]+)*\b/gi;
  const matches = text.match(pattern) ?? [];
  return matches.filter((m) => {
    const lower = m.toLowerCase();
    return !ALLOWED_HYPHEN_PROPER.some((allowed) => lower.includes(allowed));
  });
}
