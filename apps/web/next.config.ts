import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { withPostHogConfig } from "@posthog/nextjs-config";
import { mediaRemotePatterns } from "@portfolio/deploy/media-remote-patterns";
// Validate environment at build/start (throws on malformed values).
import "./src/lib/env";

const ingestionHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

// Trace from the monorepo root so the standalone/OpenNext bundle includes deps
// hoisted to the workspace root (required for pnpm + Turborepo).
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: repoRoot,
  // Cap CDN/browser stale-while-revalidate for ISR pages. Default is ~1 year,
  // which keeps old HTML (and its hashed CSS links) around across deploys.
  // With revalidate=10 this becomes s-maxage=10, stale-while-revalidate=50.
  expireTime: 60,
  // Bundle server deps into traced Lambda artifacts. Turbopack production builds
  // externalize packages into .next/node_modules with hashed names and omit
  // transitive deps on Lambda — use `next build --webpack` (see package.json).
  serverExternalPackages: [],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: mediaRemotePatterns({ allowDevPlaceholders: true }),
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
