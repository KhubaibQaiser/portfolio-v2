import { NextResponse } from "next/server";
import { getContentRepository, getJobBoardRepository } from "@portfolio/data";
import { jobStatusEnum } from "@portfolio/shared/schemas";
import type { JobListCursor } from "@portfolio/shared/ports";
import { requireAdmin } from "@/lib/auth-guard";
import { jsonInternalError } from "@/lib/log-route-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function decodeCursor(raw: string | null): JobListCursor | undefined {
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "status" in parsed &&
      "posted_at" in parsed &&
      "id" in parsed
    ) {
      const cursor = parsed as Record<string, unknown>;
      return {
        status: String(cursor.status),
        posted_at: String(cursor.posted_at),
        id: String(cursor.id),
      };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const url = new URL(request.url);
  const statusParsed = jobStatusEnum.safeParse(url.searchParams.get("status") ?? "new");
  if (!statusParsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const [page, prefs] = await Promise.all([
      getJobBoardRepository().queryByStatus({
        status: statusParsed.data,
        limit: 50,
        cursor: decodeCursor(url.searchParams.get("cursor")),
      }),
      getContentRepository().getJobPreferences(),
    ]);

    const nextCursor = page.nextCursor
      ? Buffer.from(JSON.stringify(page.nextCursor), "utf8").toString("base64url")
      : null;

    return NextResponse.json({
      items: page.items,
      nextCursor,
      recommendedJobId: prefs.recommended_job_id,
    });
  } catch (error) {
    return jsonInternalError("GET /api/jobs failed", error, "Failed to list jobs", {
      status: statusParsed.data,
    });
  }
}
