import { describe, expect, it } from "vitest";
import { hashJobNaturalKey } from "./natural-key";

describe("hashJobNaturalKey", () => {
  it("is a stable sha256 of the normalized natural key", () => {
    const a = hashJobNaturalKey({
      company: "Acme Inc",
      title: "Staff Software Engineer",
      location: "Remote",
    });
    const b = hashJobNaturalKey({
      company: "acme inc",
      title: "Staff  Software   Engineer",
      location: "remote",
    });
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});
