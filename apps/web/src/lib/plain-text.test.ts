import { describe, expect, it } from "vitest";
import { splitPlainTextParagraphs } from "./plain-text";

describe("splitPlainTextParagraphs", () => {
  it("splits on blank lines", () => {
    expect(splitPlainTextParagraphs("One.\n\nTwo.")).toEqual(["One.", "Two."]);
  });

  it("falls back to single newlines", () => {
    expect(splitPlainTextParagraphs("One.\nTwo.")).toEqual(["One.", "Two."]);
  });
});
