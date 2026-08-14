/// <reference types="node" />
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Font } from "@react-pdf/renderer";

let registered = false;
let family = "Helvetica";

function fontCandidates(): string[] {
  const fromModule = join(
    dirname(fileURLToPath(import.meta.url)),
    "fonts/DMSerifDisplay-Regular.ttf",
  );
  const cwd = process.cwd();
  return [
    fromModule,
    join(cwd, "public/fonts/DMSerifDisplay-Regular.ttf"),
    join(cwd, "apps/web/public/fonts/DMSerifDisplay-Regular.ttf"),
    join(cwd, "apps/admin/public/fonts/DMSerifDisplay-Regular.ttf"),
  ];
}

/** Registers DM Serif Display once per process. Falls back to Helvetica. */
export function registerResumePdfFonts(): void {
  if (registered) return;
  registered = true;
  const path = fontCandidates().find((candidate) => existsSync(candidate));
  if (!path) return;
  try {
    Font.register({ family: "DM Serif Display", src: path });
    family = "DM Serif Display";
  } catch {
    family = "Helvetica";
  }
}

export function headingFontFamily(): string {
  return family;
}
