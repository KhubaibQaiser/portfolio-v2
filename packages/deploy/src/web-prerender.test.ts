import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertPrerenderHasNoDemoSeed,
  assertWebBuildUsesDynamo,
  DEMO_SEED_MARKERS,
  openNextBuildEnv,
} from "./web-prerender.js";

const seedPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../data/seed/content.json",
);

describe("openNextBuildEnv", () => {
  it("prerenders the public site from Dynamo and leaves admin unchanged", () => {
    const web = openNextBuildEnv("web", { PATH: "/usr/bin" });
    expect(web.DATA_BACKEND).toBe("dynamo");
    expect(web.DYNAMO_TABLE_PREFIX).toBe("portfolio");
    expect(web.PATH).toBe("/usr/bin");

    const custom = openNextBuildEnv("web", { DYNAMO_TABLE_PREFIX: "portfolio-dev" });
    expect(custom.DYNAMO_TABLE_PREFIX).toBe("portfolio-dev");

    const admin = openNextBuildEnv("admin", { PATH: "/usr/bin" });
    expect(admin.DATA_BACKEND).toBeUndefined();
    expect(admin.DYNAMO_TABLE_PREFIX).toBeUndefined();
  });
});

describe("assertWebBuildUsesDynamo", () => {
  it("rejects a fixture backend", () => {
    expect(() => assertWebBuildUsesDynamo({ DATA_BACKEND: "fixture" })).toThrow(
      /DATA_BACKEND=dynamo/,
    );
  });

  it("requires a table prefix", () => {
    expect(() => assertWebBuildUsesDynamo({ DATA_BACKEND: "dynamo" })).toThrow(
      /DYNAMO_TABLE_PREFIX/,
    );
  });
});

describe("demo seed markers", () => {
  it("still appear in the committed fixture seed", () => {
    const seed = readFileSync(seedPath, "utf8");
    for (const marker of DEMO_SEED_MARKERS) {
      expect(seed).toContain(marker);
    }
  });
});

describe("assertPrerenderHasNoDemoSeed", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
    dirs.splice(0);
  });

  it("fails when prerendered HTML contains the demo seed", () => {
    const appDir = makeAppDir(dirs);
    writeFileSync(
      path.join(appDir, ".next", "server", "app", "index.html"),
      "<h1>Alex Rivera</h1>",
    );

    expect(() => assertPrerenderHasNoDemoSeed(appDir)).toThrow(/Alex Rivera/);
  });

  it("passes when the prerender has no demo markers", () => {
    const appDir = makeAppDir(dirs);
    writeFileSync(
      path.join(appDir, ".open-next", "cache", "index.html"),
      "<h1>Khubaib Qaiser</h1>",
    );

    expect(() => assertPrerenderHasNoDemoSeed(appDir)).not.toThrow();
  });
});

function makeAppDir(dirs: string[]): string {
  const appDir = mkdtempSync(path.join(tmpdir(), "web-prerender-"));
  dirs.push(appDir);
  mkdirSync(path.join(appDir, ".next", "server", "app"), { recursive: true });
  mkdirSync(path.join(appDir, ".open-next", "cache"), { recursive: true });
  return appDir;
}
