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

const nextConfig: NextConfig = {
  outputFileTracingRoot: repoRoot,
  skipTrailingSlashRedirect: true,
  // Keep aws-jwt-verify external (strict ESM exports break when bundled).
  // Powertools is bundled — externalizing it breaks pnpm + OpenNext resolution.
  serverExternalPackages: ["aws-jwt-verify"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: mediaRemotePatterns(),
  },
};

export default nextConfig;
