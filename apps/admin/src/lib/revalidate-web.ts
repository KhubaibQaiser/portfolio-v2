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
    if (!res.ok && process.env.NODE_ENV === "development") {
      console.warn("[admin] Web revalidate failed:", res.status, await res.text());
    }
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[admin] Web revalidate request failed:", e);
    }
  }
}
