import { NextResponse } from "next/server";
import { getRenderJobStore } from "@portfolio/data";
import { requireAdmin } from "@/lib/auth-guard";
import { logRouteError } from "@/lib/log-route-error";

export const runtime = "nodejs";
export const maxDuration = 10;

/** Polled by the admin UI while a render job is in flight. Never returns the
 * media-store object key — the actual bytes are only served through
 * `/api/resume/export/download`, which re-checks ownership itself. */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const jobId = new URL(request.url).searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json(
      { error: { code: "MISSING_JOB_ID", message: "jobId is required.", fields: {} } },
      { status: 400 },
    );
  }

  try {
    const job = await getRenderJobStore().get(jobId);
    if (!job || job.createdBy !== auth.id) {
      return NextResponse.json(
        {
          error: { code: "JOB_NOT_FOUND", message: "Render job not found.", fields: {} },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      status: job.status,
      error: job.error,
      fitReport: job.fitReport,
    });
  } catch (error) {
    logRouteError("GET /api/resume/export/status failed", error, { jobId });
    return NextResponse.json(
      {
        error: {
          code: "STATUS_LOOKUP_FAILED",
          message: "Render status could not be loaded. Try again shortly.",
          fields: {},
        },
      },
      { status: 500 },
    );
  }
}
