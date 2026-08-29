import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

export const ADR_IDS = ["0001", "0002", "0003", "0005", "0006", "0007"] as const;
export type AdrId = (typeof ADR_IDS)[number];

export const AI_CONTRACT_MODULES = ["resume", "cover-letter"] as const;
export type AiContractModule = (typeof AI_CONTRACT_MODULES)[number];

const ROOT = resolve(import.meta.dirname, "../../..");

const SCHEMA_FILES: Record<AiContractModule, string> = {
  resume: "packages/ai/src/schemas/tailored-resume.ts",
  "cover-letter": "packages/ai/src/schemas/cover-letter.ts",
};

export function repoRoot(): string {
  return ROOT;
}

export function readAdr(id: AdrId): string {
  const dir = resolve(ROOT, "docs/adr");
  const file = readdirSync(dir).find((name) => name.startsWith(`${id}-`));
  if (!file) {
    throw new Error(`No ADR found for id ${id}`);
  }
  return readFileSync(resolve(dir, file), "utf8");
}

export function readAiContract(module: AiContractModule): string {
  const schema = readFileSync(resolve(ROOT, SCHEMA_FILES[module]), "utf8");
  const shared = readFileSync(resolve(ROOT, "packages/ai/src/prompts/shared.ts"), "utf8");
  return `// schema (${SCHEMA_FILES[module]})\n${schema}\n\n// shared prompt rules\n${shared}`;
}
