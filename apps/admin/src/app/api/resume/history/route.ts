import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedAdmin } from "@portfolio/shared/constants";
import { getResumeGenerations } from "@portfolio/shared/supabase/queries";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isAllowedAdmin(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await getResumeGenerations(supabase, { limit: 20 });
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
