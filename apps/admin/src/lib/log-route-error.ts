import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { toError } from "@/lib/to-error";

/** Structured ERROR for AppErrors / Logs Insights (ADR 0002). */
export function logRouteError(
  message: string,
  error: unknown,
  extra: Record<string, string | number | boolean | null | undefined> = {},
): void {
  logger.error(message, { ...extra, error: toError(error) });
}

export function jsonInternalError(
  logMessage: string,
  error: unknown,
  clientMessage: string,
  extra: Record<string, string | number | boolean | null | undefined> = {},
): NextResponse {
  logRouteError(logMessage, error, extra);
  return NextResponse.json({ error: clientMessage }, { status: 500 });
}
