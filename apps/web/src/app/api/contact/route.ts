import { NextResponse } from "next/server";
import { contactSchema } from "@portfolio/shared/schemas/contact";
import { captureServerEvent } from "@/lib/analytics/capture-server";
import { PortfolioEvents } from "@/lib/analytics/events";
import { logger } from "@/lib/logger";
import { toError } from "@/lib/to-error";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      await captureServerEvent(undefined, PortfolioEvents.contactApiError, {
        phase: "validation",
        status: 400,
      });
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
    // Avoid logging the submission contents (PII); record receipt only.
    logger.info("contact form submission received");

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("contact form submission failed", {
      error: toError(error),
    });
    await captureServerEvent(undefined, PortfolioEvents.contactApiError, {
      phase: "unhandled",
      status: 500,
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
