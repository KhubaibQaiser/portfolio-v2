import { describe, expect, it } from "vitest";
import { latestUpdatedAt } from "./latest-updated-at";

describe("latestUpdatedAt", () => {
  it("returns the newest valid timestamp", () => {
    expect(
      latestUpdatedAt(["2024-01-01T00:00:00.000Z", "2024-06-01T00:00:00.000Z"]),
    ).toBe("2024-06-01T00:00:00.000Z");
  });

  it("ignores invalid values and falls back to epoch when none are valid", () => {
    expect(latestUpdatedAt([undefined, "not-a-date"])).toBe("1970-01-01T00:00:00.000Z");
  });
});
