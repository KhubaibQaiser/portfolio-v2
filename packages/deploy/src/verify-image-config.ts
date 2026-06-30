import { readFileSync } from "node:fs";
import path from "node:path";

type RequiredServerFiles = {
  config?: {
    images?: {
      remotePatterns?: Array<{ hostname?: string }>;
    };
  };
};

/**
 * Assert the Next.js build embedded the expected media hostname in
 * `images.remotePatterns` (baked into the OpenNext image optimizer).
 */
export function verifyImageRemotePatterns(
  appDir: string,
  expectedHostname: string,
): void {
  const manifestPath = path.join(appDir, ".next", "required-server-files.json");
  let manifest: RequiredServerFiles;

  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as RequiredServerFiles;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not read ${manifestPath}. Did \`next build\` / \`open-next build\` succeed?\n${message}`,
    );
  }

  const hostnames =
    manifest.config?.images?.remotePatterns
      ?.map((pattern) => pattern.hostname)
      .filter((hostname): hostname is string => Boolean(hostname)) ?? [];

  if (!hostnames.includes(expectedHostname)) {
    throw new Error(
      `Image optimizer config in ${manifestPath} does not allow hostname "${expectedHostname}". ` +
        `Found: ${hostnames.length > 0 ? hostnames.join(", ") : "(none)"}. ` +
        "Ensure MEDIA_PUBLIC_BASE_URL was set when running open-next build.",
    );
  }
}
