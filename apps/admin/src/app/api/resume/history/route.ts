import { NextResponse } from "next/server";
import { getContentRepository } from "@portfolio/data";
import { requireAdmin } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const rows = await getContentRepository().getResumeGenerations({ limit: 20 });
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
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
