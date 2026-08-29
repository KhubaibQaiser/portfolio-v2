import { describe, expect, it } from "vitest";
import { canTransition, followUpAtForApply, snoozeFollowUp } from "./status-machine";

describe("job status machine", () => {
  it("allows applied from new and rejects applied from closed", () => {
    expect(canTransition("new", "applied")).toBe(true);
    expect(canTransition("closed", "applied")).toBe(false);
    expect(canTransition("closed", "reviewing")).toBe(true);
  });

  it("sets follow-up seven days out on apply", () => {
    const now = new Date("2026-08-01T00:00:00.000Z");
    expect(followUpAtForApply(now)).toBe("2026-08-08T00:00:00.000Z");
  });

  it("snoozes from now when the due date is already past", () => {
    const now = new Date("2026-08-10T00:00:00.000Z");
    expect(snoozeFollowUp("2026-08-02T00:00:00.000Z", now)).toBe(
      "2026-08-17T00:00:00.000Z",
    );
  });
});
