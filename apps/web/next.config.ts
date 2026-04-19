import type { NextConfig } from "next";
import { withPostHogConfig } from "@posthog/nextjs-config";

const ingestionHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
    ],
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
