import { logger } from "@/lib/logger";

/** Notifies the public site to revalidate cached content for the given tags. */
export async function revalidateWeb(tags: string[]) {
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "");
  const secret = process.env.REVALIDATE_SECRET;
  if (!webUrl || !secret) return;

  try {
    const res = await fetch(`${webUrl}/api/revalidate`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({ tags }),
    });
    if (res.ok) {
      logger.info("web revalidation triggered", { tags });
    } else {
      // Best-effort: a failed revalidation must not break the admin write, but
      // it should be visible (not silently dropped in production).
      logger.warn("web revalidation failed", {
        tags,
        status: res.status,
        body: await res.text(),
      });
    }
  } catch (e) {
    logger.warn("web revalidation request failed", {
      tags,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
