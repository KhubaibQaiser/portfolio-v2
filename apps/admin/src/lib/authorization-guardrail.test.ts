import { globSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ADMIN_ROOT = resolve(__dirname, "../..");

// Better Auth owns the OAuth/session endpoint. Every other request handler that
// mutates state must authorize through requireAdmin(); middleware is only UX.
const PUBLIC_AUTH_ROUTES = new Set(["src/app/api/auth/[...all]/route.ts"]);

function sourceFiles(pattern: string): string[] {
  return globSync(pattern, { cwd: ADMIN_ROOT }).sort();
}

function expectGuarded(files: string[]) {
  for (const file of files) {
    const source = readFileSync(resolve(ADMIN_ROOT, file), "utf8");
    expect(source, `${file} must call requireAdmin()`).toContain("requireAdmin()");
  }
}

describe("admin authorization guardrail", () => {
  it("guards every server action file", () => {
    const files = sourceFiles("src/lib/*actions.ts");
    expect(files).toEqual([
      "src/lib/actions.ts",
      "src/lib/media-actions.ts",
    ]);
    expectGuarded(files);
  });

  it("guards every non-auth API route with a mutating HTTP method", () => {
    const mutatingMethod = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/;
    const files = sourceFiles("src/app/api/**/route.{ts,tsx}").filter((file) => {
      if (PUBLIC_AUTH_ROUTES.has(file)) return false;
      return mutatingMethod.test(readFileSync(resolve(ADMIN_ROOT, file), "utf8"));
    });

    expect(files).toEqual([
      "src/app/api/media/upload/route.ts",
      "src/app/api/resume/ats/route.ts",
      "src/app/api/resume/export/route.ts",
      "src/app/api/resume/extract-pdf/route.ts",
      "src/app/api/resume/generate/route.ts",
    ]);
    expectGuarded(files);
  });

  // Regression guard: the mutating-only check above would silently miss a
  // brand-new GET-only route (e.g. a status/read endpoint) that forgets
  // requireAdmin() entirely, since admin data is not public even to read.
  it("guards every non-auth API route regardless of HTTP method", () => {
    const anyHandler = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/;
    const files = sourceFiles("src/app/api/**/route.{ts,tsx}").filter((file) => {
      if (PUBLIC_AUTH_ROUTES.has(file)) return false;
      return anyHandler.test(readFileSync(resolve(ADMIN_ROOT, file), "utf8"));
    });

    expect(files).toEqual([
      "src/app/api/media/upload/route.ts",
      "src/app/api/resume/ats/route.ts",
      "src/app/api/resume/export/download/route.ts",
      "src/app/api/resume/export/route.ts",
      "src/app/api/resume/export/status/route.ts",
      "src/app/api/resume/extract-pdf/route.ts",
      "src/app/api/resume/generate/route.ts",
      "src/app/api/resume/generate/status/route.ts",
      "src/app/api/resume/history/[id]/route.ts",
      "src/app/api/resume/history/route.ts",
    ]);
    expectGuarded(files);
  });
});
