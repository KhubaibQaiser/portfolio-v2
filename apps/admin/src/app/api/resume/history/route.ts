import { NextResponse } from "next/server";
import { getContentRepository } from "@portfolio/data";
import { requireAdmin } from "@/lib/auth-guard";
import { jsonInternalError } from "@/lib/log-route-error";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const rows = (await getContentRepository().getResumeGenerations({ limit: 50 }))
      .filter((row) => row.created_by === auth.id)
      .slice(0, 20);
    return NextResponse.json({
      items: rows.map((r) => ({
        id: r.id,
        createdAt: r.created_at,
        company: r.company,
        role: r.role,
        model: r.model,
        fallbackUsed: r.fallback_used,
        hasResume: r.resume !== null,
        hasCoverLetter: r.cover_letter !== null,
        hasAts: r.ats !== null,
        layoutId: r.layout_id,
      })),
    });
  } catch (error) {
    return jsonInternalError(
      "GET /api/resume/history failed",
      error,
      "Failed to load generation history",
    );
  }
}
