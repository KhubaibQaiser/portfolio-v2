import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { withPostHogConfig } from "@posthog/nextjs-config";
// Validate environment at build/start (throws on malformed values).
import "./src/lib/env";

const ingestionHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

// Trace from the monorepo root so the standalone/OpenNext bundle includes deps
// hoisted to the workspace root (required for pnpm + Turborepo).
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Derive image remote patterns from the configured media base URL. */
function mediaRemotePatterns() {
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];
  const base = process.env.MEDIA_PUBLIC_BASE_URL;
  if (base) {
    try {
      const url = new URL(base);
      patterns.push({
        protocol: url.protocol.replace(":", "") as "http" | "https",
        hostname: url.hostname,
      });
    } catch {
      // ignore malformed URL
    }
  }
  // Fixture data uses placehold.co in local dev only.
  if (process.env.NODE_ENV === "development") {
    patterns.push({ protocol: "https", hostname: "placehold.co" });
  }
  return patterns;
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: repoRoot,
  skipTrailingSlashRedirect: true,
  // Bundle server deps into traced Lambda artifacts. Turbopack production builds
  // externalize packages into .next/node_modules with hashed names and omit
  // transitive deps on Lambda — use `next build --webpack` (see package.json).
  serverExternalPackages: [],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: mediaRemotePatterns(),
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-DNS-Prefetch-Control", value: "on" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "Referrer-Policy", value: "origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
      ],
    },
  ],
  async rewrites() {
    const isEu = ingestionHost.includes("eu.i.posthog");
    const assetsHost = isEu
      ? "https://eu-assets.i.posthog.com"
      : "https://us-assets.i.posthog.com";
    return [
      {
        source: "/ph/static/:path*",
        destination: `${assetsHost}/static/:path*`,
      },
      {
        source: "/ph/array/:path*",
        destination: `${assetsHost}/array/:path*`,
      },
      {
        source: "/ph/:path*",
        destination: `${ingestionHost}/:path*`,
      },
    ];
  },
};

const sourceMapsEnabled =
  process.env.NODE_ENV === "production" &&
  Boolean(process.env.POSTHOG_API_KEY) &&
  Boolean(process.env.POSTHOG_PROJECT_ID);

export default sourceMapsEnabled
  ? withPostHogConfig(nextConfig, {
      personalApiKey: process.env.POSTHOG_API_KEY!,
      projectId: process.env.POSTHOG_PROJECT_ID!,
      host: process.env.POSTHOG_APP_HOST ?? "https://us.posthog.com",
      sourcemaps: {
        enabled: true,
        deleteAfterUpload: true,
      },
    })
  : nextConfig;
