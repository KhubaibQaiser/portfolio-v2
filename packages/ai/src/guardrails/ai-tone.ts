/**
 * Regex-based "AI tell" detector. Used to decide whether a generation
 * should be silently retried once with a stricter re-ask.
 *
 * This is a heuristic, not a classifier — the goal is to catch the
 * most common, low-hanging signals (buzzwords, formulaic openers,
 * excessive em-dashes) that flag writing as AI-generated.
 */

const TELL_PATTERNS: ReadonlyArray<{ id: string; re: RegExp; weight: number }> = [
  // One em dash (U+2014) or one semicolon triggers retry (threshold 35 in generate route)
  { id: "em-dash", re: /—/g, weight: 35 },
  { id: "semicolon", re: /;/g, weight: 35 },
  { id: "opening-thrilled", re: /\b(?:i\s+am|i'm)\s+(?:thrilled|excited|delighted|eager)\s+to\s+apply\b/gi, weight: 35 },
  { id: "opening-pleasure", re: /\bit\s+is\s+(?:with\s+great\s+)?(?:pleasure|enthusiasm)\s+that\s+i\b/gi, weight: 30 },
  { id: "passionate-about", re: /\bpassionate\s+about\b/gi, weight: 15 },
  { id: "leveraged", re: /\bleverag(?:e|ed|ing)\b/gi, weight: 12 },
  { id: "utilized", re: /\butiliz(?:e|ed|ing)\b/gi, weight: 10 },
  { id: "spearheaded", re: /\bspearhead(?:ed|ing)?\b/gi, weight: 10 },
  { id: "synergy", re: /\bsynerg(?:y|ies|ized|ize|istic)\b/gi, weight: 20 },
  { id: "cutting-edge", re: /\bcutting[-\s]edge\b/gi, weight: 12 },
  { id: "innovative-solutions", re: /\binnovative\s+solutions?\b/gi, weight: 15 },
  { id: "robust", re: /\brobust\b/gi, weight: 6 },
  { id: "seamless", re: /\bseamless(?:ly)?\b/gi, weight: 8 },
  { id: "dynamic-environment", re: /\bdynamic\s+(?:environment|team|role)\b/gi, weight: 12 },
  { id: "in-conclusion", re: /\b(?:in\s+conclusion|furthermore|moreover|additionally)[,\s]/gi, weight: 8 },
  // triples: "X, Y, and Z" adjective lists
  { id: "adjective-triple", re: /\b[a-z]+ly?,\s+[a-z]+ly?,\s+and\s+[a-z]+ly?\b/gi, weight: 6 },
];

export type AiToneResult = {
  score: number;
  hits: string[];
};

/** Score a blob of text; higher = more AI-sounding. */
export function scoreAiTone(text: string): AiToneResult {
  let score = 0;
  const hits: string[] = [];
  for (const { id, re, weight } of TELL_PATTERNS) {
    const matches = text.match(re);
    if (matches && matches.length > 0) {
      score += weight * Math.min(matches.length, 3);
      hits.push(`${id}×${matches.length}`);
    }
  }
  return { score: Math.min(score, 100), hits };
}

/**
 * Flatten every string in the tailored-resume / cover-letter shape so
 * we can score the whole generation in one pass.
 */
export function collectTextForToneCheck(value: unknown): string {
  const parts: string[] = [];
  function walk(v: unknown): void {
    if (typeof v === "string") {
      parts.push(v);
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (v && typeof v === "object") {
      Object.values(v as Record<string, unknown>).forEach(walk);
    }
  }
  walk(value);
  return parts.join("\n\n");
}
