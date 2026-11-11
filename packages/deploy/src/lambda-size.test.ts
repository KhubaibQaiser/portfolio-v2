import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assertServerFunctionFits, dirSize } from "./lambda-size";

const roots: string[] = [];
function makeApp(bytes: number): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "lambda-size-"));
  roots.push(root);
  const fn = path.join(
    root,
    ".open-next",
    "server-functions",
    "default",
    "node_modules",
    "big",
  );
  mkdirSync(fn, { recursive: true });
  writeFileSync(path.join(fn, "blob.bin"), Buffer.alloc(bytes));
  return root;
}

afterEach(() => {
  for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true });
});

describe("assertServerFunctionFits", () => {
  it("passes under budget", () => {
    expect(() => assertServerFunctionFits("admin", makeApp(1000), 2000)).not.toThrow();
  });

  it("fails over budget and names the biggest directory", () => {
    const app = makeApp(5000);
    expect(() => assertServerFunctionFits("admin", app, 2000)).toThrow(/node_modules/);
  });

  it("ignores apps without a server function", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "lambda-size-"));
    roots.push(root);
    expect(() => assertServerFunctionFits("admin", root, 1)).not.toThrow();
  });

  it("sums nested files", () => {
    expect(dirSize(makeApp(1234))).toBe(1234);
  });
});
