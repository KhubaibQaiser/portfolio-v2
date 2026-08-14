/// <reference types="node" />
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Font } from "@react-pdf/renderer";

let registrationState: "pending" | "success" | "fallback" = "pending";
let family = "Helvetica";

function fontCandidates(fileName: string): string[] {
  const fromModule = join(dirname(fileURLToPath(import.meta.url)), "fonts", fileName);
  const cwd = process.cwd();
  return [
    fromModule,
    join(cwd, "public/fonts", fileName),
    join(cwd, "apps/web/public/fonts", fileName),
    join(cwd, "apps/admin/public/fonts", fileName),
  ];
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
  const missing = [
    ["DM Serif Display", serif],
    ["DM Sans Regular", sansRegular],
    ["DM Sans Medium", sansMedium],
    ["DM Sans Italic", sansItalic],
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
