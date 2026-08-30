import { describe, expect, it } from "vitest";
import {
  DEFAULT_JOB_PREFERENCES,
  jobPreferencesRowSchema,
} from "./schemas/job-preferences";

describe("jobPreferencesRowSchema", () => {
  it("maps Dynamo-omitted nullable attributes to null", () => {
    const {
      recommended_job_id: _r,
      jobspipe_last_search_date: _j,
      default_layout_id: _d,
      salary_floor: _s,
      ...required
    } = DEFAULT_JOB_PREFERENCES;
    const parsed = jobPreferencesRowSchema.parse({
      ...required,
      id: "job-preferences",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      revision: 1,
    });
    expect(parsed.recommended_job_id).toBeNull();
    expect(parsed.jobspipe_last_search_date).toBeNull();
    expect(parsed.default_layout_id).toBeNull();
    expect(parsed.salary_floor).toBeNull();
  });
});
