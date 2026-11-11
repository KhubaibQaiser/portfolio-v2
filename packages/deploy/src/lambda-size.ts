import { existsSync, lstatSync, readdirSync } from "node:fs";
import path from "node:path";

/** Lambda rejects code above 262,144,000 bytes unzipped. Fail well before it. */
export const LAMBDA_UNZIPPED_LIMIT_BYTES = 262_144_000;
export const SERVER_FN_BUDGET_BYTES = 200 * 1024 * 1024;

/** Apparent size of a directory tree. Symlinks count as links, not targets. */
export function dirSize(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const info = lstatSync(full);
    total += info.isDirectory() ? dirSize(full) : info.size;
  }
  return total;
}

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Largest directories at depth 1 and 2, for the failure message. */
export function biggestDirs(dir: string, limit = 8): string[] {
  const rows: Array<[string, number]> = [];
  for (const first of readdirSync(dir)) {
    const p1 = path.join(dir, first);
    if (!lstatSync(p1).isDirectory()) continue;
    rows.push([first, dirSize(p1)]);
    for (const second of readdirSync(p1)) {
      const p2 = path.join(p1, second);
      if (lstatSync(p2).isDirectory()) rows.push([`${first}/${second}`, dirSize(p2)]);
    }
  }
  return rows
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, size]) => `  ${mb(size).padStart(10)}  ${name}`);
}

/**
 * Fail the build, not the CloudFormation deploy, when an OpenNext server
 * function is close to the Lambda unzipped limit.
 */
export function assertServerFunctionFits(
  app: string,
  appDir: string,
  budget = SERVER_FN_BUDGET_BYTES,
): void {
  const fnDir = path.join(appDir, ".open-next", "server-functions", "default");
  if (!existsSync(fnDir)) return;
  const size = dirSize(fnDir);
  console.log(`${app} server function: ${mb(size)} (budget ${mb(budget)})`);
  if (size > budget) {
    throw new Error(
      `${app} server function is ${mb(size)}, over the ${mb(budget)} budget ` +
        `(Lambda hard limit ${mb(LAMBDA_UNZIPPED_LIMIT_BYTES)}).\nLargest directories:\n` +
        biggestDirs(fnDir).join("\n"),
    );
  }
}
