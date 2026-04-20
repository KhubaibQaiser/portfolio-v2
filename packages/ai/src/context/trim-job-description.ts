const MAX_CHARS = 12_000;

const BOILERPLATE_PATTERNS: ReadonlyArray<RegExp> = [
  /equal\s+(?:employment\s+)?opportunity[\s\S]{0,2000}/gi,
  /we\s+are\s+an\s+equal\s+opportunity\s+employer[\s\S]{0,1500}/gi,
  /affirmative\s+action\s+employer[\s\S]{0,800}/gi,
  /reasonable\s+accommodations[\s\S]{0,600}/gi,
  /click\s+(?:here\s+)?to\s+apply[\s\S]{0,200}/gi,
  /apply\s+now[\s\S]{0,100}/gi,
  /follow\s+us\s+on[\s\S]{0,200}/gi,
  /privacy\s+policy[\s\S]{0,500}/gi,
];

/**
 * Strip common JD boilerplate (EEO paragraphs, "apply now" CTAs, privacy
 * blurbs) and collapse excessive whitespace. Safe to run on text from
 * either a paste or a `unpdf` extraction. Finally caps to 12k chars.
 */
export function trimJobDescription(raw: string): string {
  let out = raw;

  for (const re of BOILERPLATE_PATTERNS) {
    out = out.replace(re, "");
  }

  // Collapse runs of blank lines and excessive whitespace.
  out = out
    .replace(/[\t\f\v]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (out.length > MAX_CHARS) {
    out = `${out.slice(0, MAX_CHARS)}\n…[truncated]`;
  }

  return out;
}
