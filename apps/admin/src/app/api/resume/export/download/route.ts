import { NextResponse } from "next/server";
import { getRenderJobStore } from "@portfolio/data";
import { requireAdmin } from "@/lib/auth-guard";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 20;

/** Serves the rendered PDF once a render job is ready. Re-checks ownership
 * independently of `/status` so a leaked/guessed jobId can't be used to pull
 * another admin's PDF (there's currently one admin user, but this is
 * defense in depth for when that changes). */
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

  const job = await getRenderJobStore().get(jobId);
  if (!job || job.createdBy !== auth.id) {
    return NextResponse.json(
      { error: { code: "JOB_NOT_FOUND", message: "Render job not found.", fields: {} } },
      { status: 404 },
    );
  }
  if (job.status !== "ready" || !job.objectKey) {
    return NextResponse.json(
      {
        error: {
          code: "JOB_NOT_READY",
          message: `Render job is ${job.status}, not ready yet.`,
          fields: {},
        },
      },
      { status: 409 },
    );
  }

  const { getMediaStore } = await import("@portfolio/data/media");
  const mediaStore = await getMediaStore();
  const object = await mediaStore.getObject(job.objectKey);
  if (!object) {
    logger.error("render job marked ready but object is missing from media store", {
      jobId,
      objectKey: job.objectKey,
    });
    return NextResponse.json(
      {
        error: {
          code: "JOB_ARTIFACT_MISSING",
          message: "The rendered PDF is missing. Please try again.",
          fields: {},
        },
      },
      { status: 500 },
    );
  }

  return new Response(new Uint8Array(object.body), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${job.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
