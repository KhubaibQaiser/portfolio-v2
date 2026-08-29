import { createHash } from "node:crypto";
import { jobNaturalKeyInput } from "@portfolio/shared/job-natural-key";

export function hashJobNaturalKey(input: {
  company: string;
  title: string;
  location: string;
  applyUrl?: string;
}): string {
  return createHash("sha256").update(jobNaturalKeyInput(input)).digest("hex");
}
