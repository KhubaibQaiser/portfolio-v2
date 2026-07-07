import { NextResponse } from "next/server";
import { getSecretString } from "@portfolio/ai/load-api-keys";
import { contactSchema } from "@portfolio/shared/schemas/contact";
import { captureServerEvent } from "@/lib/analytics/capture-server";
import { PortfolioEvents } from "@/lib/analytics/events";
import { checkContactRateLimit } from "@/lib/contact-rate-limit";
import { getClientIp } from "@/lib/chat-rate-limit";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { sendContactEmail } from "@/lib/send-contact-email";
import { toError } from "@/lib/to-error";

const NOT_CONFIGURED_MESSAGE =
  "Contact form is not configured yet. Please email directly.";
const RATE_LIMIT_MESSAGE = "Too many messages. Please try again later.";
const VERIFICATION_FAILED_MESSAGE = "Verification failed. Please try again.";
const SEND_FAILED_MESSAGE = "Failed to send message. Please try again.";

let resendKeyLoaded = false;
let turnstileSecretLoaded = false;

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  retryAfterSeconds?: number,
) {
  const retry =
    typeof retryAfterSeconds === "number"
      ? Math.max(1, Math.ceil(retryAfterSeconds))
      : undefined;
  return NextResponse.json(body, {
    status,
    headers: retry !== undefined ? { "Retry-After": String(retry) } : undefined,
  });
}

function isContactConfigured(): boolean {
  const hasResendKey =
    Boolean(env.RESEND_API_KEY) || Boolean(env.RESEND_API_KEY_SECRET_ARN);
  const hasTurnstileSecret =
    Boolean(env.TURNSTILE_SECRET_KEY) || Boolean(env.TURNSTILE_SECRET_KEY_SECRET_ARN);
  return (
    hasResendKey &&
    hasTurnstileSecret &&
    Boolean(env.CONTACT_TO_EMAIL) &&
    Boolean(env.CONTACT_FROM_EMAIL)
  );
}

async function ensureResendApiKey(): Promise<string> {
  if (env.RESEND_API_KEY) return env.RESEND_API_KEY;
  const secretArn = env.RESEND_API_KEY_SECRET_ARN;
  if (!secretArn) {
    throw new Error("RESEND_API_KEY_SECRET_ARN is not configured");
  }
  if (!resendKeyLoaded) {
    process.env.RESEND_API_KEY = await getSecretString(secretArn);
    resendKeyLoaded = true;
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return key;
}

async function ensureTurnstileSecret(): Promise<string> {
  if (env.TURNSTILE_SECRET_KEY) return env.TURNSTILE_SECRET_KEY;
  const secretArn = env.TURNSTILE_SECRET_KEY_SECRET_ARN;
  if (!secretArn) {
    throw new Error("TURNSTILE_SECRET_KEY_SECRET_ARN is not configured");
  }
  if (!turnstileSecretLoaded) {
    process.env.TURNSTILE_SECRET_KEY = await getSecretString(secretArn);
    turnstileSecretLoaded = true;
  }
  const key = process.env.TURNSTILE_SECRET_KEY;
  if (!key) {
    throw new Error("TURNSTILE_SECRET_KEY is not configured");
  }
  return key;
}

async function verifyTurnstileToken(token: string, request: Request): Promise<boolean> {
  const secret = await ensureTurnstileSecret();
  const body = new URLSearchParams({
    secret,
    response: token,
    remoteip: getClientIp(request),
  });

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );

  if (!response.ok) return false;

  const result = (await response.json()) as { success?: boolean };
  return result.success === true;
}

export async function POST(request: Request) {
  try {
    if (!isContactConfigured()) {
      await captureServerEvent(undefined, PortfolioEvents.contactApiError, {
        phase: "not_configured",
        status: 503,
      });
      return jsonResponse({ success: false, error: NOT_CONFIGURED_MESSAGE }, 503);
    }

    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      await captureServerEvent(undefined, PortfolioEvents.contactApiError, {
        phase: "validation",
        status: 400,
      });
      return jsonResponse(
        {
          success: false,
          error: "Invalid input",
          issues: parsed.error.issues,
        },
        400,
      );
    }

    const rate = await checkContactRateLimit(request);
    if (!rate.ok) {
      await captureServerEvent(undefined, PortfolioEvents.contactApiError, {
        phase: "rate_limit",
        status: 429,
      });
      return jsonResponse(
        {
          success: false,
          error: RATE_LIMIT_MESSAGE,
          retryAfterSeconds: rate.retryAfterSeconds,
        },
        429,
        rate.retryAfterSeconds,
      );
    }

    const turnstileOk = await verifyTurnstileToken(parsed.data.turnstileToken, request);
    if (!turnstileOk) {
      await captureServerEvent(undefined, PortfolioEvents.contactApiError, {
        phase: "turnstile",
        status: 400,
      });
      return jsonResponse({ success: false, error: VERIFICATION_FAILED_MESSAGE }, 400);
    }

    const apiKey = await ensureResendApiKey();
    try {
      const { id } = await sendContactEmail(
        apiKey,
        env.CONTACT_FROM_EMAIL!,
        env.CONTACT_TO_EMAIL!,
        parsed.data,
      );
      logger.info("contact form email sent", { resendId: id });
    } catch (sendError) {
      logger.error("contact form email failed", { error: toError(sendError) });
      await captureServerEvent(undefined, PortfolioEvents.contactApiError, {
        phase: "resend",
        status: 502,
      });
      return jsonResponse({ success: false, error: SEND_FAILED_MESSAGE }, 502);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("contact form submission failed", {
      error: toError(error),
    });
    await captureServerEvent(undefined, PortfolioEvents.contactApiError, {
      phase: "unhandled",
      status: 500,
    });
    return jsonResponse({ success: false, error: SEND_FAILED_MESSAGE }, 500);
  }
}
