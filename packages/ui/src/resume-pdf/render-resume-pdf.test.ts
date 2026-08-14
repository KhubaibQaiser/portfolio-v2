import { describe, expect, it } from "vitest";
import { createFixtureContentRepository } from "../../../data/src/adapters/fixture-content-repository";
import { modernBlueReferenceResume } from "../../../data/src/fixtures/modern-blue-reference";
import { getResumeData } from "../../../shared/src/resume-data";
import {
  classicLayoutForm,
  modernBlueLayoutForm,
  type ResumeLayout,
  type ResumeLayoutFormData,
} from "../../../shared/src/schemas";
import { createModernBlueStyles } from "./modern-blue-print-spec";
import { renderResumePdfBuffer } from "./render-resume-pdf";

function layoutFromForm(id: string, form: ResumeLayoutFormData): ResumeLayout {
  return {
    id,
    ...form,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
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
    expect(result.fitReport?.droppedBullets).toBe(0);
    expect(result.fitReport?.droppedSkills).toBe(0);
    expect(result.fitReport?.droppedSkillGroups).toBe(0);
  }, 30_000);

  it("fits the current production CMS projection to one page", async () => {
    const data = await getResumeData(createFixtureContentRepository());
    const layout = layoutFromForm("modern-blue-current", modernBlueLayoutForm());
    const result = await renderResumePdfBuffer(data, layout);

    expect(result.fitReport?.pageCount).toBe(1);
  }, 30_000);

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
  }, 60_000);

  it("leaves the Classic rendering path unfitted", async () => {
    const data = await getResumeData(createFixtureContentRepository());
    const classic = layoutFromForm("classic-test", classicLayoutForm());
    const result = await renderResumePdfBuffer(data, classic);

    expect(result.buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(result.fitReport).toBeNull();
  }, 30_000);
});
