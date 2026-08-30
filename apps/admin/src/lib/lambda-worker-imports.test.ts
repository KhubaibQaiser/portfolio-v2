import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ADMIN_SRC = resolve(__dirname, "..");

const WORKER_GRAPH = [
  "lambda/job-ingest-worker/index.ts",
  "lambda/job-notify-worker/index.ts",
  "lambda/generation-job-worker/index.ts",
  "lambda/generation-job-dlq-handler/index.ts",
  "lambda/render-job-worker/index.ts",
  "lambda/render-job-dlq-handler/index.ts",
  "lib/jobs/scheduled.ts",
  "lib/jobs/run-ingest.ts",
  "lib/jobs/run-notify.ts",
  "lib/jobs/send-job-email.ts",
  "lib/jobs/secrets.ts",
  "lib/resume-ai/load-candidate-facts-uncached.ts",
  "lib/resume-ai/process-generation-job.ts",
  "lib/resume-ai/process-render-job.tsx",
  "lib/logger.ts",
  "lib/to-error.ts",
];

describe("admin Lambda workers stay free of next/*", () => {
  it("does not import next/* from CDK-bundled worker modules", () => {
    for (const rel of WORKER_GRAPH) {
      const source = readFileSync(resolve(ADMIN_SRC, rel), "utf8");
      expect(source, `${rel} must not import next/*`).not.toMatch(/from ["']next\//);
    }
  });
});
