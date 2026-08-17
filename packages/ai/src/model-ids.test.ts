import { describe, expect, it } from "vitest";
import { MODEL_IDS, qualityGenerateChainIds } from "./model-ids";

describe("qualityGenerateChainIds", () => {
  it("uses Haiku then Sonnet when Anthropic is configured", () => {
    expect(qualityGenerateChainIds(true)).toEqual([
      MODEL_IDS.anthropicHaiku,
      MODEL_IDS.anthropicSonnet,
    ]);
  });

  it("uses Groq 20b only when Anthropic is missing", () => {
    expect(qualityGenerateChainIds(false)).toEqual([MODEL_IDS.groqGptOss20b]);
  });

  it("never includes Groq 120b", () => {
    expect(qualityGenerateChainIds(true)).not.toContain(MODEL_IDS.groqGptOss120b);
    expect(qualityGenerateChainIds(false)).not.toContain(MODEL_IDS.groqGptOss120b);
  });
});
