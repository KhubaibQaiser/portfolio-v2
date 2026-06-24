import { describe, expect, it } from "vitest";
import { uniqueCompanyCount } from "./experience-stats";

describe("uniqueCompanyCount", () => {
  it("counts distinct company names", () => {
    const rows = [{ company: "Acme" }, { company: "Globex" }, { company: "Acme" }];
    expect(uniqueCompanyCount(rows)).toBe(2);
  });

  it("treats surrounding whitespace as the same company", () => {
    const rows = [{ company: "Acme" }, { company: "  Acme  " }];
    expect(uniqueCompanyCount(rows)).toBe(1);
  });

  it("returns 0 for no experience", () => {
    expect(uniqueCompanyCount([])).toBe(0);
  });
});
