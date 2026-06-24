import { describe, expect, it } from "vitest";
import { createNoopMediaStore } from "./noop-media-store";

describe("createNoopMediaStore", () => {
  it("reports itself as unconfigured", () => {
    expect(createNoopMediaStore().isConfigured()).toBe(false);
  });

  it("still exposes the pure key/MIME helpers", () => {
    const store = createNoopMediaStore();
    expect(store.isAllowedImageMime("image/webp")).toBe(true);
    expect(store.buildObjectKey("x.png")).toMatch(/^media\/[0-9a-f-]{36}-x\.png$/);
  });

  it("round-trips local-style public URLs", () => {
    const store = createNoopMediaStore();
    expect(store.buildPublicObjectUrl("media/x.png")).toBe("/media/x.png");
    expect(store.publicUrlToObjectKey("/media/x.png")).toBe("media/x.png");
    expect(store.publicUrlToObjectKey("https://cdn.example.com/x")).toBeNull();
  });

  it("throws loudly on writes instead of silently succeeding", async () => {
    const store = createNoopMediaStore();
    await expect(
      store.uploadObject(new Uint8Array(), "media/x.png", "image/png"),
    ).rejects.toThrow(/not configured/i);
    await expect(store.deleteObject("media/x.png")).rejects.toThrow(/not configured/i);
    await expect(store.createPresignedPutUrl("media/x.png", "image/png")).rejects.toThrow(
      /not configured/i,
    );
  });
});
