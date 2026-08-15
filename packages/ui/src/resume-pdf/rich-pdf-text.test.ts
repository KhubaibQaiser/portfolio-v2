import { isValidElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { RichPdfText } from "./rich-pdf-text";

describe("RichPdfText", () => {
  it("removes emphasis markers without applying rich text in canonical mode", () => {
    const element = RichPdfText({
      value: "Led **React** delivery.",
      enabled: false,
    });

    expect(isValidElement<{ children: ReactNode }>(element)).toBe(true);
    if (!isValidElement<{ children: ReactNode }>(element)) return;
    expect(element.props.children).toBe("Led React delivery.");
  });

  it("creates styled segments when rich text is enabled", () => {
    const element = RichPdfText({
      value: "Led **React** delivery.",
      enabled: true,
    });

    expect(isValidElement<{ children: ReactNode }>(element)).toBe(true);
    if (!isValidElement<{ children: ReactNode }>(element)) return;
    expect(Array.isArray(element.props.children)).toBe(true);
  });
});
