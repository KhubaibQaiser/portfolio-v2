import { NextResponse } from "next/server";
import { contactSchema } from "@portfolio/shared/schemas/contact";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    // TODO: Phase 4 — Turnstile verification, Resend email, Supabase storage, rate limiting
    console.log("Contact form submission:", parsed.data);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
