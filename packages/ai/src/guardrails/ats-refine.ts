import type { AtsScore } from "../schemas/ats-score";

/** Max words per keyword (JD marketing lines often exceed this). */
const MAX_KEYWORD_WORDS = 6;
/** Drop phrase-level "keywords" copied from JD blurbs. */
const MAX_KEYWORD_CHARS = 48;

/**
 * Normalize for equivalence: "Tailwind CSS", "tailwindcss", "tailwind css"
 * all become "tailwindcss".
 */
export function canonicalKeywordKey(s: string): string {
  const alphaNum = s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return alphaNum.length > 0 ? alphaNum : s.toLowerCase().trim();
}

function dedupeKeywordsPreserveFirst(keywords: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of keywords) {
    const key = canonicalKeywordKey(k);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(k.trim());
  }
  return out;
}

/**
 * Post-processes model output: drop missing items that duplicate a matched
 * concept (spelling variants), strip long phrase-only "keywords", dedupe
 * matched list. The provider's evidence-based score is not inflated merely
 * because normalization removed duplicate or malformed keywords.
 */
export function refineAtsScore(score: AtsScore): AtsScore {
  const matchedDeduped = dedupeKeywordsPreserveFirst(score.matchedKeywords);
  const matchedKeys = new Set(matchedDeduped.map(canonicalKeywordKey));

  const missingBefore = score.missingKeywords;

  let missing = missingBefore.filter((m) => {
    const trimmed = m.trim();
    if (trimmed.length === 0) return false;
    const words = trimmed.split(/\s+/).length;
    if (words > MAX_KEYWORD_WORDS) return false;
    if (trimmed.length > MAX_KEYWORD_CHARS) return false;
    const k = canonicalKeywordKey(trimmed);
    if (matchedKeys.has(k)) return false;
    return true;
  });

  missing = dedupeKeywordsPreserveFirst(missing);

  return {
    ...score,
    matchedKeywords: matchedDeduped,
    missingKeywords: missing,
  };
}
