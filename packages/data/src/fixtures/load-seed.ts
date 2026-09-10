import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
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

  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, "packages/data/seed");
    if (existsSync(join(candidate, "content.json"))) return candidate;
    const nested = join(dir, "seed");
    if (existsSync(join(nested, "content.json"))) return nested;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return join(process.cwd(), "packages/data/seed");
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
