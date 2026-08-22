import { describe, expect, it } from "vitest";
import {
  atsResumeLayoutForm,
  classicLayoutForm,
  MODERN_BLUE_LAYOUT_ID,
  ATS_RESUME_LAYOUT_ID,
  CLASSIC_LAYOUT_ID,
} from "@portfolio/shared/schemas";
import { pickAdminResumeGeneratorDefaultLayout } from "./pick-admin-default-layout";

const ts = "2024-01-01T00:00:00.000Z";

function layoutRow(id: string, form: ReturnType<typeof classicLayoutForm>) {
  return {
    id,
    ...form,
    created_at: ts,
    updated_at: ts,
    revision: 1,
  };
}

describe("pickAdminResumeGeneratorDefaultLayout", () => {
  it("prefers ats-resume when DATA_BACKEND is fixture", () => {
    const prev = process.env.DATA_BACKEND;
    process.env.DATA_BACKEND = "fixture";
    const layouts = [
      layoutRow(CLASSIC_LAYOUT_ID, classicLayoutForm()),
      layoutRow(ATS_RESUME_LAYOUT_ID, atsResumeLayoutForm()),
    ];
    expect(pickAdminResumeGeneratorDefaultLayout(layouts)?.id).toBe(ATS_RESUME_LAYOUT_ID);
    process.env.DATA_BACKEND = prev;
  });

  it("falls back to default layout when not fixture", () => {
    const prev = process.env.DATA_BACKEND;
    process.env.DATA_BACKEND = "dynamo";
    const classic = classicLayoutForm();
    const layouts = [
      layoutRow(CLASSIC_LAYOUT_ID, { ...classic, is_default: true }),
      layoutRow(MODERN_BLUE_LAYOUT_ID, atsResumeLayoutForm()),
    ];
    expect(pickAdminResumeGeneratorDefaultLayout(layouts)?.id).toBe(CLASSIC_LAYOUT_ID);
    process.env.DATA_BACKEND = prev;
  });
});
