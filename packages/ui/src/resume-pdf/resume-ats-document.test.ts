import { describe, expect, it } from "vitest";
import { extractText, getDocumentProxy } from "unpdf";
import { atsResumeLayoutForm, type ResumeLayout } from "@portfolio/shared/schemas";
import { atsResumeReferenceData } from "./fixtures/ats-resume-reference";
import { renderResumePdfBuffer } from "./render-resume-pdf";

function layout(overrides?: Partial<ResumeLayout>): ResumeLayout {
  const form = atsResumeLayoutForm();
  return {
    id: "layout-ats-resume",
    ...form,
    ...overrides,
    guidelines: overrides?.guidelines ?? form.guidelines,
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
    expect(result.fitReport?.droppedBullets).toBeLessThanOrEqual(1);

    const text = await extractPdfText(result.buffer);
    expect(text).toContain("Khubaib Qaiser");
    expect(text.toUpperCase()).toContain("PROFESSIONAL SUMMARY");
    expect(text.toUpperCase()).toContain("TECHNICAL SKILLS");
    expect(text.toUpperCase()).toContain("PROFESSIONAL EXPERIENCE");
    expect(text.toUpperCase()).toContain("EDUCATION");
    expect(text.toUpperCase()).toContain("LANGUAGES");
    expect(text).toContain("Shopsense AI");
    expect(text).toContain("github.com/khubaibqaiser");
    expect(text).toContain("linkedin.com/in/khubaib-qaiser");
    expect(text).toContain("08/2024 - 07/2026");
    expect(text).not.toMatch(/tel:/i);
    expect(text).not.toMatch(/Jan(?:uary)?\s+2024/);
    expect(text).not.toMatch(/[\u2013\u2014]/);

    expect(text.indexOf("Frontend:")).toBeGreaterThan(
      text.indexOf("Fullstack Engineer with 11 years"),
    );
    expect(text.indexOf("Shopsense AI")).toBeGreaterThan(text.indexOf("Frontend:"));
    expect(text.indexOf("Bachelor of Computer Science")).toBeGreaterThan(
      text.indexOf("Shopsense AI"),
    );
    expect(text.indexOf("English (C1)")).toBeGreaterThan(
      text.indexOf("Bachelor of Computer Science"),
    );

    const companyAt = text.indexOf("Shopsense AI");
    const roleAt = text.indexOf("Senior Software Engineer");
    expect(companyAt).toBeGreaterThan(-1);
    expect(roleAt).toBeGreaterThan(companyAt);
  }, 30_000);

  it("uses clickable URL labels even when CMS social labels are names", async () => {
    const result = await renderResumePdfBuffer(
      {
        ...atsResumeReferenceData,
        phone: "tel:+923365532933",
        socialLinks: [
          {
            platform: "github",
            url: "https://github.com/khubaibqaiser",
            label: "GitHub",
          },
          {
            platform: "linkedin",
            url: "https://linkedin.com/in/khubaib-qaiser",
            label: "LinkedIn",
          },
        ],
      },
      layout(),
      { mode: "canonical" },
    );
    const text = await extractPdfText(result.buffer);
    expect(text.replace(/\s+/g, "")).toContain("+923365532933");
    expect(text).toContain("Islamabad, Pakistan");
    expect(text).toContain("khubaibqaiser.com");
    expect(text).not.toMatch(/tel:/i);
    expect(text).toContain("github.com/khubaibqaiser");
    expect(text).toContain("linkedin.com/in/khubaib-qaiser");
    expect(text).not.toMatch(/\|\s*GitHub\s*\|/);
    expect(text).not.toMatch(/\|\s*LinkedIn\s*\|/);
  }, 30_000);

  it("renders name and contact at the locked ATS point sizes", async () => {
    const result = await renderResumePdfBuffer(atsResumeReferenceData, layout(), {
      mode: "canonical",
    });
    const nameSize = await renderedFontSize(result.buffer, "Khubaib Qaiser");
    const titleSize = await renderedFontSize(result.buffer, "Senior Fullstack Engineer");
    const contactSize = await renderedFontSize(result.buffer, "Islamabad, Pakistan");
    expect(nameSize).toBeCloseTo(22, 1);
    expect(titleSize).toBeCloseTo(11, 1);
    expect(contactSize).toBeCloseTo(9, 1);
  }, 30_000);

  it("omits section headings when CMS visibility or data is empty", async () => {
    const result = await renderResumePdfBuffer(
      {
        ...atsResumeReferenceData,
        visibleSections: atsResumeReferenceData.visibleSections.filter(
          (section) => section !== "languages",
        ),
        projects: [],
        certifications: [],
        remoteWorkLine: null,
        referencesLine: null,
      },
      layout(),
      { mode: "canonical" },
    );
    const text = await extractPdfText(result.buffer);
    expect(text.toUpperCase()).not.toContain("LANGUAGES");
    expect(text.toUpperCase()).not.toContain("PROJECTS");
    expect(text.toUpperCase()).not.toContain("CERTIFICATIONS");
    expect(text.toUpperCase()).not.toContain("REMOTE WORK");
    expect(text.toUpperCase()).not.toContain("REFERENCES");
  }, 30_000);

  it("renders projects before education and optional blocks when enabled", async () => {
    const form = atsResumeLayoutForm();
    const result = await renderResumePdfBuffer(
      {
        ...atsResumeReferenceData,
        visibleSections: [
          ...atsResumeReferenceData.visibleSections,
          "projects",
          "certifications",
          "remote",
          "references",
        ],
        projects: [
          {
            name: "Portfolio Site",
            status: "Live",
            bullets: ["Shipped a public portfolio used as the canonical resume source."],
          },
        ],
        certifications: [{ name: "AWS Certified Developer", issuer: "Amazon" }],
        remoteWorkLine: "Remote-first across US, EU, and APAC time zones.",
        referencesLine: "Available on request.",
      },
      layout({
        guidelines: {
          ...form.guidelines,
          sections: {
            ...form.guidelines.sections,
            projects: true,
            certifications: true,
            remoteWorkExperience: true,
            references: true,
          },
        },
      }),
      { mode: "canonical" },
    );
    const text = await extractPdfText(result.buffer);
    expect(text.indexOf("Portfolio Site")).toBeGreaterThan(text.indexOf("Shopsense AI"));
    expect(text.indexOf("Bachelor of Computer Science")).toBeGreaterThan(
      text.indexOf("Portfolio Site"),
    );
    expect(text.indexOf("English (C1)")).toBeGreaterThan(
      text.indexOf("Bachelor of Computer Science"),
    );
    expect(text.indexOf("AWS Certified Developer")).toBeGreaterThan(
      text.indexOf("English (C1)"),
    );
    expect(text.indexOf("Remote-first across US")).toBeGreaterThan(
      text.indexOf("AWS Certified Developer"),
    );
    expect(text.indexOf("Available on request.")).toBeGreaterThan(
      text.indexOf("Remote-first across US"),
    );
    expect(text.toUpperCase()).toContain("PROJECTS");
    expect(text.toUpperCase()).toContain("CERTIFICATIONS");
  }, 30_000);
});
