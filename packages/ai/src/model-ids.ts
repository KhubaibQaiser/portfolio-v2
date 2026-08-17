/**
 * Canonical model ids. Centralized so upgrades happen in one place.
 * Groq IDs follow console.groq.com/docs/models.
 */
export const MODEL_IDS = {
  anthropicSonnet: "claude-sonnet-4-5",
  anthropicHaiku: "claude-haiku-4-5",
  groqGptOss120b: "openai/gpt-oss-120b",
  groqGptOss20b: "openai/gpt-oss-20b",
} as const;

export type ModelId = (typeof MODEL_IDS)[keyof typeof MODEL_IDS];

/**
 * Resume generate chain only. Chat (`fast`) stays Groq 120b elsewhere.
 * Haiku first so quality mode finishes inside the 30s attempt budget.
 * Sonnet is the sole Anthropic fallback. Groq 120b is never used here (TPM 413).
 */
export function qualityGenerateChainIds(hasAnthropicKey: boolean): readonly ModelId[] {
  if (hasAnthropicKey) {
    return [MODEL_IDS.anthropicHaiku, MODEL_IDS.anthropicSonnet];
  }
  return [MODEL_IDS.groqGptOss20b];
}
