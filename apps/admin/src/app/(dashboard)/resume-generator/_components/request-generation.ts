import {
  resumeGenerationSuccessSchema,
  type ResumeGenerationSuccess,
} from "@portfolio/ai/schemas";

export class GenerationJobError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly retryable?: boolean,
  ) {
    super(message);
    this.name = "GenerationJobError";
  }
}

const POLL_INTERVAL_MS = 30 * 1000; // 30 seconds
const MAX_POLL_MS = 2 * 60 * 1000; // 2 minutes

async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  const json: unknown = await res.json().catch(() => null);
  return typeof json === "object" &&
    json !== null &&
    "error" in json &&
    typeof json.error === "object" &&
    json.error !== null &&
    "message" in json.error &&
    typeof json.error.message === "string"
    ? json.error.message
    : fallback;
}

type EnqueueBody = {
  kind: "resume" | "cover_letter" | "both";
  jobDescription: string;
  jdSource: "paste" | "pdf";
  company?: string;
  role?: string;
  hiringManager?: string;
  mustTryToInclude?: string[];
  regenerateFromId?: string;
  layoutId?: string;
};

/**
 * Enqueues an AI generation job, polls its status, and resolves with the
 * persisted generation payload once ready.
 */
export async function requestGeneration(
  body: EnqueueBody,
  signal?: AbortSignal,
): Promise<ResumeGenerationSuccess> {
  const enqueueRes = await fetch("/api/resume/generate", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!enqueueRes.ok) {
    throw new GenerationJobError(
      await extractErrorMessage(enqueueRes, "Generation failed. Please retry."),
    );
  }
  const enqueued: unknown = await enqueueRes.json();
  if (
    typeof enqueued !== "object" ||
    enqueued === null ||
    !("jobId" in enqueued) ||
    typeof enqueued.jobId !== "string"
  ) {
    throw new GenerationJobError("Generation failed to start");
  }
  const jobId = enqueued.jobId;

  const deadline = Date.now() + MAX_POLL_MS;
  for (;;) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const statusRes = await fetch(`/api/resume/generate/status?jobId=${jobId}`, {
      signal,
    });
    if (!statusRes.ok) {
      throw new GenerationJobError(
        await extractErrorMessage(statusRes, "Generation failed. Please retry."),
      );
    }
    const statusJson = (await statusRes.json()) as {
      status: "queued" | "running" | "ready" | "failed";
      result: unknown;
      error: { code: string; message: string; retryable: boolean } | null;
    };
    if (statusJson.status === "ready") {
      const parsed = resumeGenerationSuccessSchema.safeParse(statusJson.result);
      if (!parsed.success) {
        throw new GenerationJobError(
          "The server returned an incomplete generation. Please retry.",
        );
      }
      return parsed.data;
    }
    if (statusJson.status === "failed") {
      throw new GenerationJobError(
        statusJson.error?.message ?? "Generation failed. Please retry.",
        statusJson.error?.code,
        statusJson.error?.retryable,
      );
    }
    if (Date.now() >= deadline) {
      throw new GenerationJobError(
        "Generation is taking longer than expected. Try again shortly.",
        "GENERATION_TIMEOUT",
        true,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}
