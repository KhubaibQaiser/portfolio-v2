import { describe, expect, it } from "vitest";
import { isAdminEmailAllowed } from "./allowlist";

describe("isAdminEmailAllowed", () => {
  it("returns true for an email on the allowlist", () => {
    expect(
      isAdminEmailAllowed("Admin@Example.com", "admin@example.com,other@test.com"),
    ).toBe(true);
  });

  it("returns false for an email not on the allowlist", () => {
    expect(isAdminEmailAllowed("stranger@example.com", "admin@example.com")).toBe(false);
  });

  it("returns false when the allowlist is empty or unset", () => {
    expect(isAdminEmailAllowed("admin@example.com", "")).toBe(false);
    expect(isAdminEmailAllowed("admin@example.com", undefined)).toBe(false);
  });
});
