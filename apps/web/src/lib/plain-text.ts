/** Split CMS plain text into paragraphs (blank-line first, then single newlines). */
export function splitPlainTextParagraphs(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const blocks = trimmed
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (blocks.length > 1) return blocks;
  return trimmed
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);
}
