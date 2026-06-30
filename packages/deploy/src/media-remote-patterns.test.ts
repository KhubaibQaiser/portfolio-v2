import { describe, expect, it, afterEach } from "vitest";
import { mediaRemotePatterns, isOpenNextBuild } from "./media-remote-patterns.js";
import { ssmPaths, DEFAULT_APP_NAME } from "./ssm-paths.js";

describe("ssmPaths", () => {
  it("uses lowercase app name for the base path", () => {
    expect(ssmPaths("Portfolio").mediaPublicBaseUrl).toBe(
      "/portfolio/data/media-public-base-url",
    );
  });

  it("defaults to Portfolio app name", () => {
    expect(ssmPaths().mediaBucketName).toBe("/portfolio/data/media-bucket-name");
    expect(DEFAULT_APP_NAME).toBe("Portfolio");
  });
});

describe("mediaRemotePatterns", () => {
  const env = process.env;

  afterEach(() => {
    process.env = env;
  });

  it("includes the media hostname when MEDIA_PUBLIC_BASE_URL is set", () => {
    process.env.MEDIA_PUBLIC_BASE_URL = "https://cdn.example.com";
    delete process.env.PORTFOLIO_OPENNEXT_BUILD;

    const patterns = mediaRemotePatterns();
    expect(patterns).toContainEqual({
      protocol: "https",
      hostname: "cdn.example.com",
    });
  });

  it("throws during OpenNext builds when MEDIA_PUBLIC_BASE_URL is missing", () => {
    delete process.env.MEDIA_PUBLIC_BASE_URL;
    process.env.PORTFOLIO_OPENNEXT_BUILD = "1";

    expect(() => mediaRemotePatterns()).toThrow(/MEDIA_PUBLIC_BASE_URL is required/);
  });

  it("allows empty patterns for non-OpenNext production builds", () => {
    delete process.env.MEDIA_PUBLIC_BASE_URL;
    delete process.env.PORTFOLIO_OPENNEXT_BUILD;
    process.env.NODE_ENV = "production";

    expect(mediaRemotePatterns()).toEqual([
      { protocol: "https", hostname: "media.licdn.com" },
      { protocol: "https", hostname: "static.licdn.com" },
    ]);
  });

  it("isOpenNextBuild reflects PORTFOLIO_OPENNEXT_BUILD", () => {
    process.env.PORTFOLIO_OPENNEXT_BUILD = "1";
    expect(isOpenNextBuild()).toBe(true);
    delete process.env.PORTFOLIO_OPENNEXT_BUILD;
    expect(isOpenNextBuild()).toBe(false);
  });
});
