import { describe, expect, it } from "vitest";
import { extractText, getDocumentProxy } from "unpdf";
import { atsResumeLayoutForm, type ResumeLayout } from "@portfolio/shared/schemas";
import { atsResumeReferenceData } from "./fixtures/ats-resume-reference";
import { renderResumePdfBuffer } from "./render-resume-pdf";

function layout(): ResumeLayout {
  return {
    id: "layout-ats-resume",
    ...atsResumeLayoutForm(),
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const document = await getDocumentProxy(new Uint8Array(buffer));
  try {
    const extracted = await extractText(document, { mergePages: true });
    return Array.isArray(extracted.text) ? extracted.text.join("\n") : extracted.text;
  } finally {
    await document.destroy();
  }
}

async function renderedFontSize(buffer: Buffer, needle: string): Promise<number> {
  const document = await getDocumentProxy(new Uint8Array(buffer));
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const { items } = await page.getTextContent();
      const match = items.find(
        (item): item is typeof item & { str: string; transform: number[] } =>
          "str" in item && item.str.includes(needle),
      );
      if (match) return Math.hypot(match.transform[2]!, match.transform[3]!);
    }
    throw new Error(`No rendered text run contains "${needle}"`);
  } finally {
    await document.destroy();
  }
}

describe("ATS React-PDF rendering", () => {
  it("renders the reference resume as one A4 page with ATS section titles", async () => {
    const result = await renderResumePdfBuffer(atsResumeReferenceData, layout(), {
      mode: "canonical",
      fit: "guidelines-only",
    });

    expect(result.buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(result.fitReport?.pageCount).toBe(1);
    expect(result.fitReport?.droppedRoles).toBe(0);
    expect(result.fitReport?.degraded).toBe(false);

    const text = await extractPdfText(result.buffer);
    expect(text).toContain("Khubaib Qaiser");
    expect(text.toUpperCase()).toContain("PROFESSIONAL SUMMARY");
    expect(text.toUpperCase()).toContain("TECHNICAL SKILLS");
    expect(text.toUpperCase()).toContain("PROFESSIONAL EXPERIENCE");
    expect(text.toUpperCase()).toContain("EDUCATION");
    expect(text.toUpperCase()).toContain("LANGUAGES");
    expect(text).toContain("Shopsense AI");
    expect(text).not.toMatch(/Jan(?:uary)?\s+2024/);
  }, 30_000);

  it("renders name and contact at the locked ATS point sizes", async () => {
    const result = await renderResumePdfBuffer(atsResumeReferenceData, layout(), {
      mode: "canonical",
    });
    const nameSize = await renderedFontSize(result.buffer, "Khubaib Qaiser");
    const contactSize = await renderedFontSize(result.buffer, "Islamabad, Pakistan");
    expect(nameSize).toBeCloseTo(19, 1);
    expect(contactSize).toBeCloseTo(8.6, 1);
  }, 30_000);
});
