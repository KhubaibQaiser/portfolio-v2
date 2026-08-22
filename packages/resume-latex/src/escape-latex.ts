const LATEX_SPECIAL = /[&%$#_{}]/g;

const REPLACEMENTS: Record<string, string> = {
  "&": "\\&",
  "%": "\\%",
  $: "\\$",
  "#": "\\#",
  _: "\\_",
  "{": "\\{",
  "}": "\\}",
};

/** Escape text for LaTeX body (not inside commands). */
export function escapeLatex(text: string): string {
  return text.replace(LATEX_SPECIAL, (ch) => REPLACEMENTS[ch] ?? ch);
}

/** Strip markdown bold markers from tailored content. */
export function stripMarkdownBold(text: string): string {
  return text.replace(/\*\*/g, "");
}
