export type MediaRemotePatternOptions = {
  /** Allow placehold.co in development (web fixture data). */
  allowDevPlaceholders?: boolean;
};

type RemotePattern = {
  protocol: "http" | "https";
  hostname: string;
  port?: string;
  pathname?: string;
};

/** True when building OpenNext deploy artifacts (set by the deploy build script). */
export function isOpenNextBuild(): boolean {
  return process.env.PORTFOLIO_OPENNEXT_BUILD === "1";
}

/**
 * Derive Next.js `images.remotePatterns` from `MEDIA_PUBLIC_BASE_URL`.
 * Fails loudly during OpenNext builds when the env var is missing or invalid.
 */
export function mediaRemotePatterns(
  options: MediaRemotePatternOptions = {},
): RemotePattern[] {
  const patterns: RemotePattern[] = [];
  const base = process.env.MEDIA_PUBLIC_BASE_URL;
  const requireMediaBaseUrl = isOpenNextBuild();

  if (requireMediaBaseUrl && !base) {
    throw new Error(
      "MEDIA_PUBLIC_BASE_URL is required for OpenNext deploy builds. " +
        "Run `pnpm build:open-next` (with AWS credentials so SSM can be read) " +
        "or export MEDIA_PUBLIC_BASE_URL before `open-next build`.",
    );
  }

  if (base) {
    let url: URL;
    try {
      url = new URL(base);
    } catch {
      throw new Error(`MEDIA_PUBLIC_BASE_URL is not a valid URL: ${base}`);
    }

    patterns.push({
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
    });
  }

  if (options.allowDevPlaceholders && process.env.NODE_ENV === "development") {
    patterns.push({ protocol: "https", hostname: "placehold.co" });
  }

  return patterns;
}
