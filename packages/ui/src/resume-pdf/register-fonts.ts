/// <reference types="node" />
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Font } from "@react-pdf/renderer";

let registrationState: "pending" | "success" | "fallback" = "pending";
let family = "Helvetica";

function moduleDirCandidate(fileName: string): string | null {
  // `import.meta.url` is empty when a bundler (esbuild's CJS output format,
  // used by the standalone Lambda bundlers in packages/infra) can't provide
  // it — fall through to the cwd-relative candidates below instead of
  // throwing, since this is only ever a "does the file exist" probe.
  try {
    return join(dirname(fileURLToPath(import.meta.url)), "fonts", fileName);
  } catch {
    return null;
  }
}

function fontCandidates(fileName: string): string[] {
  const cwd = process.cwd();
  return [
    moduleDirCandidate(fileName),
    join(cwd, "public/fonts", fileName),
    join(cwd, "apps/web/public/fonts", fileName),
    join(cwd, "apps/admin/public/fonts", fileName),
    join(cwd, "packages/ui/src/resume-pdf/fonts", fileName),
  ].filter((candidate): candidate is string => candidate !== null);
}

function resolveFont(fileName: string): string | null {
  return fontCandidates(fileName).find((candidate) => existsSync(candidate)) ?? null;
}

/** Registers the vendored resume font families once per process. */
export function registerResumePdfFonts(): void {
  if (registrationState !== "pending") return;

  const serif = resolveFont("DMSerifDisplay-Regular.ttf");
  const sansRegular = resolveFont("DMSans-Regular.ttf");
  const sansMedium = resolveFont("DMSans-Medium.ttf");
  const sansItalic = resolveFont("DMSans-Italic.ttf");
  const carlitoRegular = resolveFont("Carlito-Regular.ttf");
  const carlitoBold = resolveFont("Carlito-Bold.ttf");
  const carlitoItalic = resolveFont("Carlito-Italic.ttf");
  const carlitoBoldItalic = resolveFont("Carlito-BoldItalic.ttf");
  const missing = [
    ["DM Serif Display", serif],
    ["DM Sans Regular", sansRegular],
    ["DM Sans Medium", sansMedium],
    ["DM Sans Italic", sansItalic],
    ["Carlito Regular", carlitoRegular],
    ["Carlito Bold", carlitoBold],
    ["Carlito Italic", carlitoItalic],
    ["Carlito Bold Italic", carlitoBoldItalic],
  ]
    .filter((entry) => !entry[1])
    .map((entry) => entry[0]);

  if (missing.length > 0) {
    registrationState = "fallback";
    if (process.env.NODE_ENV !== "production") {
      throw new Error(`Missing resume fonts: ${missing.join(", ")}`);
    }
    return;
  }

  try {
    Font.register({ family: "DM Serif Display", src: serif! });
    Font.register({ family: "DM Sans", src: sansRegular! });
    Font.register({ family: "DM Sans Medium", src: sansMedium! });
    Font.register({ family: "DM Sans SemiBold", src: sansMedium! });
    Font.register({ family: "DM Sans Italic", src: sansItalic!, fontStyle: "italic" });
    Font.register({
      family: "Carlito",
      fonts: [
        { src: carlitoRegular! },
        { src: carlitoBold!, fontWeight: 700 },
        { src: carlitoItalic!, fontStyle: "italic" },
        { src: carlitoBoldItalic!, fontWeight: 700, fontStyle: "italic" },
      ],
    });
    family = "DM Serif Display";
    registrationState = "success";
  } catch (error) {
    registrationState = "fallback";
    family = "Helvetica";
    if (process.env.NODE_ENV !== "production") throw error;
  }
}

export function headingFontFamily(): string {
  return family;
}
