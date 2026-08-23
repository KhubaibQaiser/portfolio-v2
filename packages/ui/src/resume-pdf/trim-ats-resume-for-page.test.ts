import { describe, expect, it } from "vitest";
import { atsResumeReferenceData } from "./fixtures/ats-resume-reference";
import { trimAtsResumeForPage, trimOneOldestAtsBullet } from "./trim-ats-resume-for-page";

describe("trimAtsResumeForPage", () => {
  it("never drops roles", () => {
    const trimmed = trimAtsResumeForPage(atsResumeReferenceData, 1);
    expect(trimmed.experience).toHaveLength(atsResumeReferenceData.experience.length);
    expect(trimmed.experience.every((role) => role.bullets.length >= 1)).toBe(true);
  });

  it("trims oldest roles first when over the total budget", () => {
    const trimmed = trimAtsResumeForPage(atsResumeReferenceData, 2);
    expect(trimmed.experience[0]!.bullets.length).toBeGreaterThanOrEqual(
      trimmed.experience.at(-1)!.bullets.length,
    );
  });
});

describe("trimOneOldestAtsBullet", () => {
  it("removes a bullet from the oldest role that still has extras", () => {
    const next = trimOneOldestAtsBullet(atsResumeReferenceData);
    expect(next).not.toBeNull();
    expect(next!.experience).toHaveLength(atsResumeReferenceData.experience.length);
    const trimmedIndex = next!.experience.findIndex((role, index) => {
      return (
        role.bullets.length < atsResumeReferenceData.experience[index]!.bullets.length
      );
    });
    expect(trimmedIndex).toBe(0);
    expect(next!.experience[0]!.bullets).toHaveLength(
      atsResumeReferenceData.experience[0]!.bullets.length - 1,
    );
  });
});
