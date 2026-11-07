import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Strings that exist only in the committed demo seed. A production web
 * prerender that contains them was built against fixtures and must not be
 * deployed — that HTML becomes the ISR cache.
 */
export const DEMO_SEED_MARKERS = ["Alex Rivera", "Northwind Labs"] as const;

export const DEFAULT_DYNAMO_TABLE_PREFIX = "portfolio";

export type OpenNextApp = "web" | "admin";

const PRERENDER_DIRS = [
  path.join(".open-next", "cache"),
  path.join(".next", "server", "app"),
] as const;

const MAX_SCAN_BYTES = 2 * 1024 * 1024;

/** Env for one OpenNext app. Only the public site prerenders from Dynamo. */
export function openNextBuildEnv(
  app: OpenNextApp,
  base: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  if (app !== "web") return { ...base };
  const prefix = base.DYNAMO_TABLE_PREFIX;
  return {
    ...base,
    DATA_BACKEND: "dynamo",
    DYNAMO_TABLE_PREFIX:
      prefix && prefix.length > 0 ? prefix : DEFAULT_DYNAMO_TABLE_PREFIX,
  };
}

/** Refuse a web production build that would prerender the fixture seed. */
export function assertWebBuildUsesDynamo(env: NodeJS.ProcessEnv): void {
  if (env.DATA_BACKEND?.toLowerCase() !== "dynamo") {
    throw new Error(
      "The public site OpenNext build must set DATA_BACKEND=dynamo. " +
        "Without it, pages prerender from the demo seed and that HTML is uploaded as the ISR cache.",
    );
  }
  if (!env.DYNAMO_TABLE_PREFIX) {
    throw new Error(
      "The public site OpenNext build must set DYNAMO_TABLE_PREFIX so it reads the same tables as the web Lambda.",
    );
  }
}

/**
 * Fail when prerendered web output still contains the demo seed.
 * Scans the OpenNext ISR cache and the Next server prerender.
 */
export function assertPrerenderHasNoDemoSeed(appDir: string): void {
  const roots = PRERENDER_DIRS.map((relative) => path.join(appDir, relative)).filter(
    (dir) => existsSync(dir),
  );
  if (roots.length === 0) {
    throw new Error(
      `No prerender output under ${appDir}. Expected .open-next/cache or .next/server/app after the web open-next build.`,
    );
  }

  const hits: string[] = [];
  for (const root of roots) {
    for (const file of walkFiles(root)) {
      const text = readText(file);
      if (text === null) continue;
      for (const marker of DEMO_SEED_MARKERS) {
        if (text.includes(marker)) {
          hits.push(`${path.relative(appDir, file)} contains "${marker}"`);
        }
      }
    }
  }

  if (hits.length > 0) {
    throw new Error(
      "Production web prerender contains the demo seed, so the ISR cache would publish fixture pages.\n" +
        "The web OpenNext build must read DynamoDB (DATA_BACKEND=dynamo).\n" +
        hits.slice(0, 20).join("\n"),
    );
  }
}

function walkFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const info = statSync(full);
    if (info.isDirectory()) {
      files.push(...walkFiles(full));
    } else if (info.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function readText(file: string): string | null {
  const buffer = readFileSync(file);
  if (buffer.length > MAX_SCAN_BYTES || buffer.includes(0)) return null;
  return buffer.toString("utf8");
}
