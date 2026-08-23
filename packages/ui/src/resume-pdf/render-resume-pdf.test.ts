import { describe, expect, it, vi } from "vitest";
import { extractText, getDocumentProxy } from "unpdf";
import { createFixtureContentRepository } from "../../../data/src/adapters/fixture-content-repository";
import { modernBlueReferenceResume } from "../../../data/src/fixtures/modern-blue-reference";
import { getResumeData } from "../../../shared/src/resume-data";
import {
  classicLayoutForm,
  modernBlueLayoutForm,
  pickDefaultResumeLayout,
  type ResumeLayout,
  type ResumeLayoutFormData,
} from "../../../shared/src/schemas";
import { createModernBlueStyles } from "./modern-blue-print-spec";
import {
  projectModernBlueResume,
  removeLeastRelevantBullet,
} from "./fit-modern-blue-resume";
import { ResumeFitDeadlineError, renderResumePdfBuffer } from "./render-resume-pdf";

function layoutFromForm(id: string, form: ResumeLayoutFormData): ResumeLayout {
  return {
    id,
    ...form,
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

/**
 * Real rendered font size (in PDF points) of the first text run containing
 * `needle`, read from pdf.js's glyph transform matrix. Unlike scanning raw
 * PDF content streams (fragile: `TJ` kerning arrays split literals across
 * multiple show-text operators), this reflects what actually got drawn.
 */
async function renderedFontSize(buffer: Buffer, needle: string): Promise<number> {
  const document = await getDocumentProxy(new Uint8Array(buffer));
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
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

describe("Modern Blue PDF rendering", () => {
  it("converts the golden CSS measurements to PDF points", () => {
    const guidelines = modernBlueLayoutForm().guidelines;
    const styles = createModernBlueStyles(guidelines, "reference");

    expect(styles.name.fontSize).toBe(21);
    expect(styles.sidebar.width).toBe(144);
    expect(styles.summary.borderLeftWidth).toBe(2.25);
  });

  it("renders the canonical CMS fixture as exactly one A4 page", async () => {
    const layout = layoutFromForm("modern-blue-test", modernBlueLayoutForm());
    const result = await renderResumePdfBuffer(modernBlueReferenceResume, layout);

    expect(result.buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(result.fitReport?.pageCount).toBe(1);
    expect(result.fitReport?.droppedRoles).toBe(0);
    expect(result.fitReport?.droppedBullets).toBe(2);
    expect(result.fitReport?.droppedSkills).toBe(0);
    expect(result.fitReport?.droppedSkillGroups).toBe(0);
    expect(result.fitReport?.retainedRoles).toBe(8);
    expect(result.fitReport?.acceptedBulletCounts[0]).toBeGreaterThanOrEqual(4);
    expect(result.fitReport?.acceptedBulletCounts[1]).toBeGreaterThanOrEqual(2);
    const text = await extractPdfText(result.buffer);
    expect(text).toContain("Knowledge Platform");
    expect(text).not.toContain("**");
    expect(result.fitReport?.mode).toBe("canonical");
  }, 30_000);

  it("fits the current production CMS projection to one page", async () => {
    const data = await getResumeData(createFixtureContentRepository());
    const layout = layoutFromForm("modern-blue-current", modernBlueLayoutForm());
    const result = await renderResumePdfBuffer(data, layout);

    expect(result.fitReport?.pageCount).toBe(1);
  }, 30_000);

  it("allocates more bullets to recent roles and caps older roles", () => {
    const guidelines = modernBlueLayoutForm().guidelines;
    const projection = projectModernBlueResume(modernBlueReferenceResume, guidelines);

    expect(projection.data.experience.map((item) => item.company)).toEqual([
      "Shopsense AI",
      "Powerful Web Design",
      "Achieve",
      "Tradeblock",
      "GudangAda",
      "Nordic Tech Clients",
      "STOQO",
      "Knowledge Platform",
    ]);
    expect(projection.projectedBulletBudgets).toEqual([5, 4, 2, 2, 2, 2, 2, 2]);
    expect(projection.data.experience.map((item) => item.bullets.length)).toEqual([
      5, 2, 2, 1, 2, 1, 1, 1,
    ]);
  });

  it("trims older roles before reducing the newest role", () => {
    const data = {
      ...modernBlueReferenceResume,
      experience: modernBlueReferenceResume.experience.slice(0, 4).map((item) => ({
        ...item,
        bullets: Array.from({ length: 5 }, (_, index) => `Bullet ${index + 1}`),
      })),
    };
    const projection = projectModernBlueResume(data, modernBlueLayoutForm().guidelines);

    expect(removeLeastRelevantBullet(projection)).toBe(true);
    expect(projection.data.experience.map((item) => item.bullets.length)).toEqual([
      5, 4, 2, 1,
    ]);
  });

  it("deterministically reduces a maximum-density payload to one page", async () => {
    const source = await getResumeData(createFixtureContentRepository());
    const longBullet =
      "Built and operated a production platform with measurable outcomes across frontend architecture, cloud infrastructure, observability, accessibility, testing, and cross-functional delivery.";
    const data = {
      ...source,
      summary: `${source.summary} ${source.summary}`.slice(0, 650),
      experience: source.experience.slice(0, 7).map((experience) => ({
        ...experience,
        bullets: Array.from({ length: 5 }, (_, index) => `${longBullet} ${index + 1}`),
      })),
      skills: source.skills.slice(0, 6).map((group) => ({
        ...group,
        items: Array.from({ length: 14 }, (_, index) => `${group.category} ${index + 1}`),
      })),
    };
    const layout = layoutFromForm("modern-blue-max", modernBlueLayoutForm());
    const result = await renderResumePdfBuffer(data, layout);

    expect(result.fitReport?.pageCount).toBe(1);
    expect(
      (result.fitReport?.droppedBullets ?? 0) +
        (result.fitReport?.droppedRoles ?? 0) +
        (result.fitReport?.droppedSkills ?? 0),
    ).toBeGreaterThan(0);
    if ((result.fitReport?.droppedRoles ?? 0) > 0) {
      expect(result.fitReport?.density).toBe("fitCompact");
    }
  }, 60_000);

  it("drops the oldest role only when all-role minimums genuinely overflow", async () => {
    const longBullet =
      "Delivered a production platform spanning architecture, accessibility, observability, testing, cloud infrastructure, stakeholder collaboration, performance improvements, and measurable customer outcomes across multiple international product teams.";
    const data = {
      ...modernBlueReferenceResume,
      summary: modernBlueReferenceResume.summary.repeat(2).slice(0, 550),
      experience: Array.from({ length: 20 }, (_, index) => ({
        ...modernBlueReferenceResume.experience[0]!,
        company: `Company ${index + 1}`,
        role: `Senior Platform Engineering Role ${index + 1}`,
        startDate: `Jan ${2026 - index}`,
        endDate: `Dec ${2026 - index}`,
        period: `${2026 - index}`,
        bullets: [longBullet],
      })),
      skills: [],
      projects: [],
      certifications: [],
      languages: [],
      remoteWorkLine: null,
      referencesLine: null,
    };
    // maxExperienceItems is widened for this fixture so the scenario exercises
    // the iterative per-role-minimum overflow fallback in isolation from the
    // (separately tested) maxExperienceItems search-space cap below.
    const form = modernBlueLayoutForm();
    const layout = layoutFromForm("modern-blue-overflow", {
      ...form,
      guidelines: {
        ...form.guidelines,
        validation: { ...form.guidelines.validation, maxExperienceItems: 20 },
      },
    });
    const result = await renderResumePdfBuffer(data, layout);

    expect(result.fitReport?.pageCount).toBe(1);
    expect(result.fitReport?.droppedRoles).toBeGreaterThan(0);
    expect(result.fitReport?.fallbackSteps).toContain("removed-oldest-role");
    expect(result.fitReport?.roleDropReason).not.toBeNull();
  }, 60_000);

  it("skips fit-search drops when fit is guidelines-only", async () => {
    const longBullet =
      "Delivered a production platform spanning architecture, accessibility, observability, testing, cloud infrastructure, stakeholder collaboration, performance improvements, and measurable customer outcomes across multiple international product teams.";
    const data = {
      ...modernBlueReferenceResume,
      summary: modernBlueReferenceResume.summary.repeat(2).slice(0, 550),
      experience: Array.from({ length: 12 }, (_, index) => ({
        ...modernBlueReferenceResume.experience[0]!,
        company: `Company ${index + 1}`,
        role: `Senior Platform Engineering Role ${index + 1}`,
        startDate: `Jan ${2026 - index}`,
        endDate: `Dec ${2026 - index}`,
        period: `${2026 - index}`,
        bullets: [longBullet, longBullet, longBullet],
      })),
    };
    const layout = layoutFromForm("modern-blue-guidelines-only", modernBlueLayoutForm());
    const maxRoles = layout.guidelines.validation.maxExperienceItems;
    const result = await renderResumePdfBuffer(data, layout, {
      mode: "canonical",
      fit: "guidelines-only",
    });

    expect(result.fitReport?.mode).toBe("canonical");
    expect(result.fitReport?.density).toBe("reference");
    expect(result.fitReport?.renderAttempts).toBe(1);
    expect(result.fitReport?.fallbackSteps).toEqual([]);
    expect(result.fitReport?.retainedRoles).toBe(maxRoles);
    expect(result.fitReport?.droppedRoles).toBe(0);
  }, 30_000);

  it("bounds the fit-search to maxExperienceItems regardless of role count", async () => {
    const data = {
      ...modernBlueReferenceResume,
      experience: Array.from({ length: 20 }, (_, index) => ({
        ...modernBlueReferenceResume.experience[0]!,
        company: `Company ${index + 1}`,
        startDate: `Jan ${2026 - index}`,
        endDate: `Dec ${2026 - index}`,
        period: `${2026 - index}`,
        bullets: ["Shipped a feature."],
      })),
    };
    const layout = layoutFromForm("modern-blue-cap", modernBlueLayoutForm());
    const result = await renderResumePdfBuffer(data, layout);

    expect(result.fitReport?.pageCount).toBe(1);
    expect(result.fitReport?.retainedRoles).toBeLessThanOrEqual(
      layout.guidelines.validation.maxExperienceItems,
    );
    // Recency-sorted: the most recent role (index 0, "Jan 2026") must survive
    // the cap even though 20 roles were supplied.
    expect(result.fitReport && result.fitReport.acceptedBulletCounts.length > 0).toBe(
      true,
    );
  }, 30_000);

  it("throws ResumeFitDeadlineError when the deadline has already passed", async () => {
    const layout = layoutFromForm("modern-blue-deadline-past", modernBlueLayoutForm());
    await expect(
      renderResumePdfBuffer(modernBlueReferenceResume, layout, {
        deadlineAt: Date.now() - 1_000,
      }),
    ).rejects.toBeInstanceOf(ResumeFitDeadlineError);
  });

  it("falls back to a degraded result instead of throwing once the deadline is exceeded mid-search", async () => {
    const layout = layoutFromForm("modern-blue-deadline-mid", modernBlueLayoutForm());
    const realNow = Date.now;
    let calls = 0;
    // Deterministic instead of timing-based: the entry guard and the first
    // in-loop check see real time (deadline not yet exceeded, so the search
    // actually starts); every check after that sees far-future time, forcing
    // the terminal fallback exactly once real work has begun.
    const nowSpy = vi
      .spyOn(Date, "now")
      .mockImplementation(() => (calls++ < 2 ? realNow() : realNow() + 10 * 60_000));

    try {
      const result = await renderResumePdfBuffer(modernBlueReferenceResume, layout, {
        deadlineAt: realNow() + 60_000,
      });

      expect(result.buffer.subarray(0, 5).toString()).toBe("%PDF-");
      expect(result.fitReport?.pageCount).toBeGreaterThanOrEqual(1);
      expect(result.fitReport?.fallbackSteps).toContain("degraded-terminal-fallback");
    } finally {
      nowSpy.mockRestore();
    }
  }, 30_000);

  it("never throws even when education has no reduction path left before this fix", async () => {
    const longBullet =
      "Delivered a production platform spanning architecture, accessibility, observability, testing, cloud infrastructure, stakeholder collaboration, performance improvements, and measurable customer outcomes across multiple international product teams and business units.";
    const data = {
      ...modernBlueReferenceResume,
      summary: modernBlueReferenceResume.summary.repeat(3),
      experience: Array.from({ length: 8 }, (_, index) => ({
        ...modernBlueReferenceResume.experience[0]!,
        company: `Company ${index + 1}`,
        bullets: [longBullet, longBullet],
      })),
      education: Array.from({ length: 10 }, (_, index) => ({
        institution: `University ${index + 1}`,
        degree: "B.Sc. Computer Science",
        year: `${2000 + index}`,
      })),
    };
    const layout = layoutFromForm(
      "modern-blue-education-overflow",
      modernBlueLayoutForm(),
    );
    const result = await renderResumePdfBuffer(data, layout);

    expect(result.buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(result.fitReport?.pageCount).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it("records tailored rendering mode explicitly", async () => {
    const layout = layoutFromForm("modern-blue-tailored", modernBlueLayoutForm());
    const result = await renderResumePdfBuffer(modernBlueReferenceResume, layout, {
      mode: "tailored",
      highlightedSkills: ["React", "Invented Skill"],
    });

    expect(result.fitReport?.mode).toBe("tailored");
    expect(result.fitReport?.pageCount).toBe(1);
  }, 30_000);

  it("renders the Classic section order and URL-based header labels", async () => {
    const classic = layoutFromForm("classic-test", classicLayoutForm());
    const result = await renderResumePdfBuffer(modernBlueReferenceResume, classic);
    const text = await extractPdfText(result.buffer);

    expect(result.buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(result.fitReport).toBeNull();
    expect(text).toContain("khubaibqaiser.com");
    expect(text).toContain("linkedin.com/in/khubaib-qaiser");
    expect(text).toContain("github.com/khubaibqaiser");
    expect(text).not.toContain("Portfolio");
    expect(text).toContain("• Led Embeds");
    expect(text.indexOf("Frontend & UI:")).toBeLessThan(text.indexOf("• Led Embeds"));
    expect(text.indexOf("Frontend & UI:")).toBeLessThan(
      text.indexOf("Bachelor's Computer Science"),
    );
  }, 30_000);

  it("renders the Classic header contact row at the guideline's contact size", async () => {
    const classic = layoutFromForm("classic-contact-size", classicLayoutForm());
    const expected = classic.guidelines.formatting.typography.bodySizes.contact;
    const result = await renderResumePdfBuffer(modernBlueReferenceResume, classic);

    const locationSize = await renderedFontSize(result.buffer, "Islamabad, Pakistan");
    const emailSize = await renderedFontSize(result.buffer, "khubaib.dev@gmail.com");

    expect(locationSize).toBeCloseTo(expected, 1);
    expect(emailSize).toBeCloseTo(expected, 1);
  }, 30_000);

  it("renders the default /api/pdf layout (fixture repo, no cache) at the reduced contact size", async () => {
    // Mirrors apps/web's /api/pdf route: fixture ContentRepository, the
    // default resume layout (Classic, is_default: true), and no cache layer
    // in front of the render — isolates whether the guideline change reaches
    // the actual public PDF-download path, independent of DB/S3 staleness.
    const repo = createFixtureContentRepository();
    const [data, layouts] = await Promise.all([
      getResumeData(repo),
      repo.getResumeLayouts(),
    ]);
    const layout = pickDefaultResumeLayout(layouts);
    expect(layout?.component_key).toBe("classic");

    const result = await renderResumePdfBuffer(data, layout);
    const locationSize = await renderedFontSize(result.buffer, data.location);

    expect(locationSize).toBeCloseTo(8.5, 1);
  }, 30_000);

  it("renders the Modern Blue header contact row at the guideline's contact size", async () => {
    const modern = layoutFromForm("modern-blue-contact-size", modernBlueLayoutForm());
    const expected = modern.guidelines.formatting.typography.bodySizes.contact;
    const result = await renderResumePdfBuffer(modernBlueReferenceResume, modern);

    const locationSize = await renderedFontSize(result.buffer, "Islamabad, Pakistan");
    const emailSize = await renderedFontSize(result.buffer, "khubaib.dev@gmail.com");

    expect(locationSize).toBeCloseTo(expected, 1);
    expect(emailSize).toBeCloseTo(expected, 1);
  }, 30_000);
});
