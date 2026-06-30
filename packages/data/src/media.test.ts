import { afterEach, describe, expect, it } from "vitest";
import { isMediaStorageConfigured } from "./media";

describe("isMediaStorageConfigured", () => {
  const env = process.env;

  afterEach(() => {
    process.env = env;
  });

  it("returns false when either env var is missing", () => {
    delete process.env.S3_MEDIA_BUCKET;
    delete process.env.MEDIA_PUBLIC_BASE_URL;
    expect(isMediaStorageConfigured()).toBe(false);

    process.env.S3_MEDIA_BUCKET = "bucket";
    delete process.env.MEDIA_PUBLIC_BASE_URL;
    expect(isMediaStorageConfigured()).toBe(false);
  });

  it("returns true when both env vars are set", () => {
    process.env.S3_MEDIA_BUCKET = "bucket";
    process.env.MEDIA_PUBLIC_BASE_URL = "https://cdn.example.com";
    expect(isMediaStorageConfigured()).toBe(true);
  });
});
