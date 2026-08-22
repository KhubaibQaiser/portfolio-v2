import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { LatexCompileError } from "./errors";

const execFileAsync = promisify(execFile);

const XELATEX_TIMEOUT_MS = 120_000;

export type XeLatexResult = {
  pdfBuffer: Buffer;
  texSource: string;
  workDir: string;
};

export async function compileXeLatex(texSource: string): Promise<XeLatexResult> {
  const workDir = await mkdtemp(join(tmpdir(), "ats-resume-"));
  const texPath = join(workDir, "resume.tex");

  try {
    await writeFile(texPath, texSource, "utf8");

    const runXeLatex = async () => {
      await execFileAsync(
        "xelatex",
        ["-interaction=nonstopmode", "-halt-on-error", "resume.tex"],
        {
          cwd: workDir,
          timeout: XELATEX_TIMEOUT_MS,
          env: { ...process.env, OPENTYPE_AAT_LAYOUT: "0" },
        },
      );
    };

    await runXeLatex();
    await runXeLatex();

    const pdfBuffer = await readFile(join(workDir, "resume.pdf"));
    return { pdfBuffer, texSource, workDir };
  } catch (error) {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
    const message = error instanceof Error ? error.message : String(error);
    throw new LatexCompileError(
      "XeLaTeX compilation failed. Ensure xelatex and Carlito fonts are installed.",
      message,
    );
  }
}

export async function cleanupXeLatexWorkDir(workDir: string): Promise<void> {
  await rm(workDir, { recursive: true, force: true }).catch(() => {});
}
