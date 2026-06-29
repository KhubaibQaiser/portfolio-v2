import { getRevalidateSecret } from "@portfolio/ai/load-api-keys";
import { WEB_CONTENT_TAGS } from "@portfolio/shared/constants";
import { logger } from "@/lib/logger";

export { WEB_CONTENT_TAGS };

export type RevalidateWebResult = { ok: true } | { ok: false; error: string };

function resolveWebSiteUrl(): string | undefined {
  const serverUrl = process.env.WEB_SITE_URL?.replace(/\/$/, "");
  if (serverUrl) return serverUrl;
  return process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "");
}

/** Notifies the public site to revalidate cached content for the given tags. */
export async function revalidateWeb(tags: readonly string[]): Promise<RevalidateWebResult> {
  const webUrl = resolveWebSiteUrl();

  let secret: string | undefined;
  try {
    secret = await getRevalidateSecret();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("revalidation secret load failed", { tags, error: message });
    return { ok: false, error: message };
  }

  if (!webUrl) {
    return {
      ok: false,
      error: "WEB_SITE_URL (or NEXT_PUBLIC_WEB_URL for local dev) is not configured",
    };
  }
  if (!secret) {
    return { ok: false, error: "Revalidation secret is not configured" };
  }

  try {
    const res = await fetch(`${webUrl}/api/revalidate`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({ tags: [...tags] }),
    });

    const body = (await res.json().catch(() => null)) as
      | { success?: boolean; error?: string }
      | null;

    if (res.ok && body?.success) {
      logger.info("web revalidation triggered", { tags });
      return { ok: true };
    }

    const errorMessage =
      body?.error ??
      (typeof body === "string" ? body : null) ??
      `Revalidation failed (${res.status})`;

    logger.warn("web revalidation failed", {
      tags,
      status: res.status,
      error: errorMessage,
    });
    return { ok: false, error: errorMessage };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logger.warn("web revalidation request failed", { tags, error: message });
    return { ok: false, error: message };
  }
}
