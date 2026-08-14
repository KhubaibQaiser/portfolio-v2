import { describe, expect, it } from "vitest";
import { parseRichText } from "./parse-rich-text";

describe("parseRichText", () => {
  it("returns a single plain segment when there are no markers", () => {
    expect(parseRichText("Shipped the platform.")).toEqual([
      { text: "Shipped the platform.", bold: false },
    ]);
  });

  it("splits bold markers", () => {
    expect(parseRichText("Led **Embeds** on **AWS**.")).toEqual([
      { text: "Led ", bold: false },
      { text: "Embeds", bold: true },
      { text: " on ", bold: false },
      { text: "AWS", bold: true },
      { text: ".", bold: false },
    ]);
  });

  it("leaves unmatched asterisks as plain text", () => {
    expect(parseRichText("Score * 2")).toEqual([{ text: "Score * 2", bold: false }]);
  });
});
