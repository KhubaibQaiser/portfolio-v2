"use server";

import { getContentRepository } from "@portfolio/data";
import { requireAdmin } from "@/lib/auth-guard";
import type { ActionResult } from "@/lib/actions";

const repo = getContentRepository();

export async function deleteMediaAsset(id: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const row = await repo.getMediaById(id);
    const { getMediaStore } = await import("@portfolio/data/media");
    const mediaStore = await getMediaStore();
    if (mediaStore.isConfigured()) {
      const key = mediaStore.publicUrlToObjectKey(row.url);
      if (key) await mediaStore.deleteObject(key);
    }
    await repo.deleteMediaRow(id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
