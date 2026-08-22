import { describe, expect, it } from "vitest";
import { escapeLatex, stripMarkdownBold } from "./escape-latex";

describe("escape-latex", () => {
  it("escapes special characters", () => {
    expect(escapeLatex("100% & more")).toBe("100\\% \\& more");
  });

  it("strips markdown bold", () => {
    expect(stripMarkdownBold("**React**")).toBe("React");
  });
});
