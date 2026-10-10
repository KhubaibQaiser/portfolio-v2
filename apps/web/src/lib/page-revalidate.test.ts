import { describe, expect, it } from "vitest";
import {
  PAGE_EXPIRE_TIME_SECONDS,
  PAGE_REVALIDATE_SECONDS,
  PAGE_STALE_WHILE_REVALIDATE_SECONDS,
} from "./page-revalidate";

describe("page revalidate window", () => {
  it("keeps every public page fresh for 48 hours", () => {
    expect(PAGE_REVALIDATE_SECONDS).toBe(48 * 60 * 60);
  });

  it("keeps expireTime above revalidate so the short stale grace is emitted", () => {
    expect(PAGE_EXPIRE_TIME_SECONDS).toBe(
      PAGE_REVALIDATE_SECONDS + PAGE_STALE_WHILE_REVALIDATE_SECONDS,
    );
    expect(PAGE_EXPIRE_TIME_SECONDS).toBeGreaterThan(PAGE_REVALIDATE_SECONDS);
  });
});
