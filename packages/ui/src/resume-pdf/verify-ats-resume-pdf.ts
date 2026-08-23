import { extractText, getDocumentProxy } from "unpdf";

const BANNED_UNICODE = /[\u2013\u2014\u2018\u2019\u201c\u201d]/g;
const TEXT_MONTH_DATE =
  /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\b/gi;

export class AtsResumeVerifyError extends Error {
  constructor(
    message: string,
    readonly checklistItem?: number,
  ) {
    super(message);
    this.name = "AtsResumeVerifyError";
  }
}

export type VerifyAtsResumePdfReport = {
  pageCount: number;
  bannedUnicodeMatches: string[];
  textMonthDates: string[];
};

export type VerifyAtsResumePdfOptions = {
  requireOnePage?: boolean;
};

async function pdfPageCount(buffer: Buffer): Promise<number> {
  const document = await getDocumentProxy(new Uint8Array(buffer));
  try {
    return document.numPages;
  } finally {
    await document.destroy();
  }
}

async function pdfToText(buffer: Buffer): Promise<string> {
  const document = await getDocumentProxy(new Uint8Array(buffer));
  try {
    const extracted = await extractText(document, { mergePages: true });
    return Array.isArray(extracted.text) ? extracted.text.join("\n") : extracted.text;
  } finally {
    await document.destroy();
  }
}

/** ATS text-layer checks: one page, no smart punctuation, numeric dates. */
export async function verifyAtsResumePdf(
  buffer: Buffer,
  options: VerifyAtsResumePdfOptions = {},
): Promise<VerifyAtsResumePdfReport> {
  const requireOnePage = options.requireOnePage ?? true;
  const pageCount = await pdfPageCount(buffer);
  const text = await pdfToText(buffer);
  const bannedUnicodeMatches = [...new Set(text.match(BANNED_UNICODE) ?? [])];
  const textMonthDates = text.match(TEXT_MONTH_DATE) ?? [];

  if (requireOnePage && pageCount !== 1) {
    throw new AtsResumeVerifyError(
      `Resume must be exactly 1 page (got ${pageCount}).`,
      1,
    );
  }

  if (bannedUnicodeMatches.length > 0) {
    throw new AtsResumeVerifyError(
      `PDF text layer contains banned Unicode characters: ${bannedUnicodeMatches.join(", ")}`,
      2,
    );
  }

  if (textMonthDates.length > 0) {
    throw new AtsResumeVerifyError(
      `PDF contains non-numeric date formats: ${textMonthDates.join(", ")}`,
      4,
    );
  }

  return { pageCount, bannedUnicodeMatches, textMonthDates };
}
