import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildContentFixturesFromRaw,
  type ContentFixtureBundle,
  type SeedDocument,
} from "./content";

/**
 * Resolves `packages/data/seed` without `import.meta` so OpenNext/esbuild CJS
 * bundles (admin workers) do not warn or resolve an empty path.
 */
function resolveSeedDir(): string {
  const fromEnv = process.env.PORTFOLIO_SEED_DIR;
  if (fromEnv) return fromEnv;

  // Fixed candidates only. A loop that walks up with dirname() makes Next's
  // file tracer (@vercel/nft) treat the base as a wildcard and pull the whole
  // repo (apps/web, apps/admin, node_modules/.pnpm) into the Lambda bundle.
  const cwd = process.cwd();
  const candidates = [
    join(cwd, "packages/data/seed"), // repo root
    join(cwd, "../../packages/data/seed"), // apps/<name>
    join(cwd, "seed"), // packages/data
  ];
  return (
    candidates.find((dir) => existsSync(join(dir, "content.json"))) ?? candidates[0]!
  );
}

export function committedSeedPath(): string {
  return join(resolveSeedDir(), "content.json");
}

export function localSeedPath(): string {
  return join(resolveSeedDir(), "content.local.json");
}

/** @deprecated Prefer {@link committedSeedPath} — path is cwd-relative. */
export const COMMITTED_SEED_PATH = committedSeedPath();

/** @deprecated Prefer {@link localSeedPath}. */
export const LOCAL_SEED_PATH = localSeedPath();

export function readSeedDocument(path: string): SeedDocument {
  return JSON.parse(readFileSync(path, "utf8")) as SeedDocument;
}

export function loadSeedBundle(path: string): ContentFixtureBundle {
  return buildContentFixturesFromRaw(readSeedDocument(path));
}

/**
 * Private local CV for fixture-mode dev. Never used when `CI` or `VITEST` is
 * set, so unit tests and CI always stay on the committed demo seed.
 */
export function tryLoadLocalSeedBundle(): ContentFixtureBundle | null {
  if (process.env.CI || process.env.VITEST) return null;
  if (process.env.SEED_SOURCE === "committed") return null;
  const path = localSeedPath();
  if (!existsSync(path)) return null;
  return loadSeedBundle(path);
}
