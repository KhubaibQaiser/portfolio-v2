import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedAdmin } from "@portfolio/shared/constants";
import { getResumeGenerationById } from "@portfolio/shared/supabase/queries";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isAllowedAdmin(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const row = await getResumeGenerationById(supabase, id);
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ row });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
