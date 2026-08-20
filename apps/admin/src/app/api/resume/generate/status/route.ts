import { NextResponse } from "next/server";
import { getGenerationJobStore } from "@portfolio/data";
import { requireAdmin } from "@/lib/auth-guard";

export const runtime = "nodejs";
export const maxDuration = 10;

/** Polled by the admin UI while an AI generation job is in flight. */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const jobId = new URL(request.url).searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json(
      {
        error: {
          code: "MISSING_JOB_ID",
          message: "jobId is required.",
          retryable: false,
        },
      },
      { status: 400 },
    );
  }

  const job = await getGenerationJobStore().get(jobId);
  if (!job || job.createdBy !== auth.id) {
    return NextResponse.json(
      {
        error: {
          code: "JOB_NOT_FOUND",
          message: "Generation job not found.",
          retryable: false,
        },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    status: job.status,
    result: job.result,
    error: job.error,
  });
}
