import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PAGE_EXPIRE_TIME_SECONDS,
  PAGE_REVALIDATE_SECONDS,
  PAGE_STALE_WHILE_REVALIDATE_SECONDS,
} from "./page-revalidate";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../app");

function listSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...listSourceFiles(full));
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

describe("page revalidate window", () => {
  it("keeps every public page fresh for 48 hours", () => {
    expect(PAGE_REVALIDATE_SECONDS).toBe(48 * 60 * 60);
  });

  it("writes the page segment config as a numeric literal Next can extract", () => {
    const pattern = /export const revalidate = ([^;\n]+);/g;
    const mismatches: string[] = [];
    let found = 0;

    for (const file of listSourceFiles(appDir)) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(pattern)) {
        found += 1;
        const value = match[1];
        if (value !== String(PAGE_REVALIDATE_SECONDS)) {
          mismatches.push(`${path.relative(appDir, file)} exports ${value}`);
        }
      }
    }

    expect(found).toBeGreaterThan(0);
    expect(mismatches).toEqual([]);
  });

  it("keeps expireTime above revalidate so the short stale grace is emitted", () => {
    expect(PAGE_EXPIRE_TIME_SECONDS).toBe(
      PAGE_REVALIDATE_SECONDS + PAGE_STALE_WHILE_REVALIDATE_SECONDS,
    );
    expect(PAGE_EXPIRE_TIME_SECONDS).toBeGreaterThan(PAGE_REVALIDATE_SECONDS);
  });
});
