export type RichTextSegment = {
  text: string;
  bold: boolean;
};

/** Splits `**bold**` markers into segments. Unmatched markers render literally. */
export function parseRichText(input: string): RichTextSegment[] {
  if (!input) return [];
  const segments: RichTextSegment[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input)) !== null) {
    if (match.index > last) {
      segments.push({ text: input.slice(last, match.index), bold: false });
    }
    segments.push({ text: match[1] ?? "", bold: true });
    last = match.index + match[0].length;
  }
  if (last < input.length) {
    segments.push({ text: input.slice(last), bold: false });
  }
  return segments.filter((s) => s.text.length > 0);
}
