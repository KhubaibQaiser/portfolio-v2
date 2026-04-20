/**
 * Strip zero-width, bidi, and control characters that sometimes sneak in
 * when a model tries to avoid a literal em-dash or when it echoes a
 * copy-pasted JD glyph. Normalizes whitespace so downstream @react-pdf
 * rendering is predictable.
 */
export function sanitizeLlmOutput(input: string): string {
  return input
    .replace(/[\u200B-\u200F\uFEFF\u202A-\u202E]/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\r\n/g, "\n")
    // Drop stray HTML/XML-like tags the model sometimes leaks
    // (e.g. <br>, </strong>, <system>) while preserving ASCII art
    // comparisons like `x < y` and common arrows `->`.
    .replace(/<\/?[a-zA-Z][^<>]*>/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Parse a JSON object from model text that may include ```json fences or
 * leading/trailing prose. Used when the provider does not support
 * `json_schema` / structured outputs (e.g. Groq llama-3.1-8b-instant).
 */
export function parseJsonObjectFromLlm(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1]!.trim() : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new SyntaxError("No JSON object found in model output");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as unknown;
}

/** Recursively sanitize every string leaf in an object tree. */
export function sanitizeLlmObject<T>(value: T): T {
  if (typeof value === "string") {
    return sanitizeLlmOutput(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeLlmObject(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeLlmObject(v);
    }
    return out as T;
  }
  return value;
}
