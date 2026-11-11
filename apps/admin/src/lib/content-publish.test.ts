import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentPublisher } from "@portfolio/shared/ports";

const getContentPublisher = vi.fn<() => ContentPublisher | null>();
const warn = vi.fn();

vi.mock("@portfolio/data/content-publish", () => ({ getContentPublisher }));
vi.mock("@/lib/logger", () => ({ logger: { warn } }));

const { publishContentChanged } = await import("./content-publish");

describe("publishContentChanged", () => {
  beforeEach(() => {
    getContentPublisher.mockReset();
    warn.mockReset();
  });

  it("is a no-op without a configured publisher (local dev)", async () => {
    getContentPublisher.mockReturnValue(null);
    await expect(publishContentChanged()).resolves.toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
  });

  it("publishes one ContentChanged event", async () => {
    const publish = vi.fn(async () => {});
    getContentPublisher.mockReturnValue({ publishContentChanged: publish });
    await publishContentChanged();
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it("never fails the save when publishing fails", async () => {
    getContentPublisher.mockReturnValue({
      publishContentChanged: vi.fn(async () => {
        throw new Error("throttled");
      }),
    });
    await expect(publishContentChanged()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
