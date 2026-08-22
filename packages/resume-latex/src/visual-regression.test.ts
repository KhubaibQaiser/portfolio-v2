import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { assembleResumeDocumentFromData, readVendoredReferenceDocument } from "./assemble-document";
import { compileXeLatex, cleanupXeLatexWorkDir } from "./xelatex-runner";
import { atsResumeReferenceData } from "../fixtures/ats-resume-reference";

const fixturesDir = (() => {
  const cwd = process.cwd();
  const candidates = [
    join(dirname(fileURLToPath(import.meta.url)), "../fixtures"),
    join(cwd, "packages/resume-latex/fixtures"),
    join(cwd, "fixtures"),
  ];
  return candidates.find((dir) => existsSync(join(dir, "Khubaib_Qaiser_LaTeX_Template_Reference.pdf"))) ?? candidates[0]!;
})();
const goldenPdfPath = join(fixturesDir, "Khubaib_Qaiser_LaTeX_Template_Reference.pdf");
const goldenPngPath = join(fixturesDir, "Khubaib_Qaiser_LaTeX_Template_Reference-page.png");
const RASTER_DPI = 150;

function hasTool(command: string): boolean {
  try {
    if (command === "pdftoppm") {
      execFileSync(command, ["-v"], { stdio: "pipe" });
    } else {
      execFileSync(command, ["--version"], { stdio: "pipe" });
    }
    return true;
  } catch {
    return false;
  }
}

function rasterizePdfPage(pdfPath: string, outputPrefix: string): string {
  execFileSync(
    "pdftoppm",
    ["-png", "-r", String(RASTER_DPI), "-singlefile", pdfPath, outputPrefix],
    { stdio: "pipe" },
  );
  return `${outputPrefix}.png`;
}

function readPng(path: string): PNG {
  return PNG.sync.read(readFileSync(path));
}

function pixelDiffCount(leftPath: string, rightPath: string): number {
  const left = readPng(leftPath);
  const right = readPng(rightPath);
  if (left.width !== right.width || left.height !== right.height) {
    throw new Error(
      `PNG dimensions differ: ${left.width}x${left.height} vs ${right.width}x${right.height}`,
    );
  }
  return pixelmatch(left.data, right.data, undefined, left.width, left.height, {
    threshold: 0.1,
  });
}

const canRunVisual =
  hasTool("xelatex") && hasTool("pdftoppm") && existsSync(goldenPdfPath);

describe("ats-resume visual regression", () => {
  it.skipIf(!canRunVisual)("vendored template matches golden PDF at fixed DPI", async () => {
    const tex = readVendoredReferenceDocument();
    const { workDir } = await compileXeLatex(tex);
    const vendoredPdfPath = join(workDir, "resume.pdf");
    const vendoredPngPath = rasterizePdfPage(vendoredPdfPath, join(workDir, "vendored-page"));
    const diffPixels = pixelDiffCount(goldenPngPath, vendoredPngPath);
    expect(diffPixels).toBe(0);
    await cleanupXeLatexWorkDir(workDir);
  });

  it.skipIf(!canRunVisual)("vendored template compiles", async () => {
    const tex = readVendoredReferenceDocument();
    const { pdfBuffer, workDir } = await compileXeLatex(tex);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    await cleanupXeLatexWorkDir(workDir);
  });

  it.skipIf(!canRunVisual)("builder output matches golden PDF at fixed DPI", async () => {
    if (!existsSync(goldenPngPath)) {
      rasterizePdfPage(goldenPdfPath, goldenPngPath.replace(/\.png$/, ""));
    }

    const tex = assembleResumeDocumentFromData(atsResumeReferenceData);
    const { pdfBuffer, workDir } = await compileXeLatex(tex);
    const builtPdfPath = join(workDir, "resume.pdf");
    const builtPngPath = rasterizePdfPage(builtPdfPath, join(workDir, "built-page"));

    const diffPixels = pixelDiffCount(goldenPngPath, builtPngPath);
    expect(diffPixels).toBe(0);

    await cleanupXeLatexWorkDir(workDir);
    expect(pdfBuffer.subarray(0, 4).toString()).toBe("%PDF");
  });
});
