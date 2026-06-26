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
  // Keep Node-native deps external so OpenNext traces them into the Lambda
  // bundle instead of letting the bundler choke on their ESM `exports`:
  //  - aws-jwt-verify: strict ESM exports @vercel/nft can't trace when bundled
  //  - @aws-lambda-powertools/logger: runtime logger, no value in bundling
  serverExternalPackages: [
    "aws-jwt-verify",
    "@aws-lambda-powertools/logger",
    "@aws-sdk/client-secrets-manager",
  ],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: mediaRemotePatterns(),
  },
};

export default nextConfig;
