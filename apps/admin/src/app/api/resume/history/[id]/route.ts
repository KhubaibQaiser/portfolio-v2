import { NextResponse } from "next/server";
import { getContentRepository } from "@portfolio/data";
import { requireAdmin } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const row = await getContentRepository().getResumeGenerationById(id);
    if (!row || row.created_by !== auth.id || row.deleted_at) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ row });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
