/** Turns an uploaded filename into a non-empty image alt fallback. */
export function altTextFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "");
  const spaced = base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return spaced || filename.trim() || "Image";
}
