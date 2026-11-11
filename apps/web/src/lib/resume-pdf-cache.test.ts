import { describe, expect, it } from "vitest";
import {
  CANONICAL_RESUME_CACHED_AT_METADATA_KEY,
  CANONICAL_RESUME_PDF_CACHE_CONTROL,
  CANONICAL_RESUME_PDF_REBUILD_INTERVAL_SECONDS,
  CANONICAL_RESUME_PDF_TTL_SECONDS,
  hashCanonicalResumeContent,
  isCanonicalResumeCacheFresh,
} from "./resume-pdf-cache";
import { PAGE_REVALIDATE_SECONDS } from "./page-revalidate";

const data = { name: "Test" };
const classic = { id: "a", component_key: "classic", version: 1, guidelines: { a: 1 } };
const ats = { id: "a", component_key: "ats-resume", version: 1, guidelines: { a: 1 } };

describe("hashCanonicalResumeContent", () => {
  it("changes when the layout component key changes", () => {
    const classicHash = hashCanonicalResumeContent(data as never, classic as never);
    const atsHash = hashCanonicalResumeContent(data as never, ats as never);
    expect(classicHash).not.toBe(atsHash);
  });
});

describe("isCanonicalResumeCacheFresh", () => {
  it("treats missing or stale cached-at as a miss", () => {
    const now = Date.parse("2026-08-23T12:00:00.000Z");
    expect(isCanonicalResumeCacheFresh(undefined, now)).toBe(false);
    expect(isCanonicalResumeCacheFresh({}, now)).toBe(false);
    expect(
      isCanonicalResumeCacheFresh(
        { [CANONICAL_RESUME_CACHED_AT_METADATA_KEY]: "2026-08-21T11:59:00.000Z" },
        now,
      ),
    ).toBe(false);
  });

  it("keeps the PDF on the page ISR window, renewed by a sweep inside it", () => {
    expect(CANONICAL_RESUME_PDF_TTL_SECONDS).toBe(PAGE_REVALIDATE_SECONDS);
    expect(CANONICAL_RESUME_PDF_REBUILD_INTERVAL_SECONDS).toBeLessThan(
      CANONICAL_RESUME_PDF_TTL_SECONDS,
    );
    expect(CANONICAL_RESUME_PDF_CACHE_CONTROL).toContain(
      `s-maxage=${PAGE_REVALIDATE_SECONDS}`,
    );
  });

  it("accepts a cached-at within the TTL", () => {
    const now = Date.parse("2026-08-23T12:00:00.000Z");
    const cachedAt = new Date(now - (CANONICAL_RESUME_PDF_TTL_SECONDS - 1) * 1000);
    expect(
      isCanonicalResumeCacheFresh(
        { [CANONICAL_RESUME_CACHED_AT_METADATA_KEY]: cachedAt.toISOString() },
        now,
      ),
    ).toBe(true);
  });
});
