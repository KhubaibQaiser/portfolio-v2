import { describe, expect, it } from "vitest";
import { companyDomainFromName, jobNaturalKeyInput } from "./job-natural-key";

describe("job natural key", () => {
  it("normalizes title and company for the same posting", () => {
    const a = jobNaturalKeyInput({
      company: "Acme Inc",
      title: "Staff Software Engineer",
      location: "Remote",
    });
    const b = jobNaturalKeyInput({
      company: "acme inc",
      title: "Staff  Software   Engineer",
      location: "remote",
    });
    expect(a).toBe(b);
  });

  it("prefers a non-ATS apply-url host as the company domain", () => {
    expect(companyDomainFromName("Acme", "https://careers.acme.com/jobs/1")).toBe(
      "careers.acme.com",
    );
    expect(
      companyDomainFromName("Acme", "https://boards.greenhouse.io/acme/jobs/1"),
    ).toBe("acme");
  });
});
