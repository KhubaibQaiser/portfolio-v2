import { getRevalidateSecret } from "@portfolio/ai/load-api-keys";
import { logger } from "@/lib/logger";

/** Tags used by the public site's `unstable_cache` wrappers in apps/web/src/lib/data.ts */
export const WEB_CONTENT_TAGS = [
  "hero",
  "about",
  "experience",
  "skills",
  "site-config",
  "projects",
  "testimonials",
  "resume",
  "media",
] as const;

export type RevalidateWebResult = { ok: true } | { ok: false; error: string };

/** Notifies the public site to revalidate cached content for the given tags. */
export async function revalidateWeb(tags: readonly string[]): Promise<RevalidateWebResult> {
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "");

  let secret: string | undefined;
  try {
    secret = await getRevalidateSecret();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("revalidation secret load failed", { tags, error: message });
    return { ok: false, error: message };
  }

  if (!webUrl) {
    return { ok: false, error: "NEXT_PUBLIC_WEB_URL is not configured" };
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

    if (res.ok) {
      logger.info("web revalidation triggered", { tags });
      return { ok: true };
    }

    const body = await res.text();
    logger.warn("web revalidation failed", { tags, status: res.status, body });
    return {
      ok: false,
      error: `Revalidation failed (${res.status})${body ? `: ${body}` : ""}`,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logger.warn("web revalidation request failed", { tags, error: message });
    return { ok: false, error: message };
  }
}
