import { describe, expect, it } from "vitest";
import { readAdr, readAiContract } from "./context";

describe("portfolio-context MCP readers", () => {
  it("returns ADR 0001 with the SSM-registry decision", () => {
    const text = readAdr("0001");
    expect(text).toContain("Cross-stack references");
    expect(text).toContain("SSM registry");
  });

  it("returns ADR 0002 with the AppErrors alarm decision", () => {
    const text = readAdr("0002");
    expect(text).toContain("Cost optimization");
    expect(text).toContain("AppErrors");
  });

  it("returns ADR 0003 with the candidate-mcp trust boundary", () => {
    const text = readAdr("0003");
    expect(text).toContain("Candidate Profile MCP server");
    expect(text).toContain("origin-verify");
  });

  it("returns ADR 0005 with the API key auth decision", () => {
    const text = readAdr("0005");
    expect(text).toContain("API keys");
    expect(text).toContain("Cognito");
  });

  it("returns the resume schema and shared prompt rules", () => {
    const text = readAiContract("resume");
    expect(text).toContain("tailoredResumeSchema");
    expect(text).toContain("ANTI_FABRICATION_RULES");
  });

  it("returns the cover-letter schema and shared prompt rules", () => {
    const text = readAiContract("cover-letter");
    expect(text).toContain("coverLetterSchema");
    expect(text).toContain("PROMPT_INJECTION_RULES");
  });
});
