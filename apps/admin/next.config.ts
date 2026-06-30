import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
// Validate environment at build/start (throws on malformed values).
import "./src/lib/env";

// Trace from the monorepo root so the standalone/OpenNext bundle includes deps
// hoisted to the workspace root (required for pnpm + Turborepo).
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Derive an image remote pattern from the configured media base URL. */
function mediaRemotePatterns() {
  const base = process.env.MEDIA_PUBLIC_BASE_URL;
  if (!base) return [];
  try {
    const url = new URL(base);
    return [
      {
        protocol: url.protocol.replace(":", "") as "http" | "https",
        hostname: url.hostname,
      },
    ];
  } catch {
    return [];
  }
}

/** Hostnames allowed for Server Actions CSRF checks (no protocol). */
function serverActionAllowedOrigins(): string[] {
  const origins = new Set([
    "localhost:3001",
    "*.cloudfront.net",
    "*.lambda-url.eu-west-1.on.aws",
  ]);

  const appOrigin = process.env.APP_ORIGIN;
  if (appOrigin) {
    try {
      origins.add(new URL(appOrigin).host);
    } catch {
      // ignore malformed APP_ORIGIN at build time
    }
  }

  return [...origins];
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: repoRoot,
  skipTrailingSlashRedirect: true,
  serverExternalPackages: [],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: mediaRemotePatterns(),
  },
  // CloudFront → Lambda function URL sets x-forwarded-host to the function URL
  // while Origin stays on the CloudFront domain; without this, every Server
  // Action POST is rejected as an invalid forwarded request.
  experimental: {
    serverActions: {
      allowedOrigins: serverActionAllowedOrigins(),
    },
  },
};

export default nextConfig;
