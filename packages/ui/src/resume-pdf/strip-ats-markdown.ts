/** Strip markdown bold markers from tailored ATS content. */
export function stripAtsMarkdownBold(text: string): string {
  return text.replace(/\*\*/g, "");
}
