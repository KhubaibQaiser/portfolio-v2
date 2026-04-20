"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { MediaAssetCard } from "@portfolio/ui/media-asset-card";
import { MediaDropzone } from "@portfolio/ui/media-dropzone";
import { formatBytes } from "@portfolio/shared/utils";
import type { Database } from "@portfolio/shared/supabase/database.types";
import { deleteMediaAsset } from "@/lib/actions";

type MediaRow = Database["public"]["Tables"]["media"]["Row"];

type MediaLibraryProps = {
  initialItems: MediaRow[];
  storageReady: boolean;
};

function formatUploadedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function MediaLibrary({ initialItems, storageReady }: MediaLibraryProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!storageReady) return;
      setUploading(true);
      setMessage("");
      try {
        for (const file of files) {
          const fd = new FormData();
          fd.set("file", file);
          const res = await fetch("/api/media/upload", { method: "POST", body: fd });
          const data: unknown = await res.json().catch(() => ({}));
          const err =
            typeof data === "object" && data !== null && "error" in data && typeof (data as { error: unknown }).error === "string"
              ? (data as { error: string }).error
              : null;
          if (!res.ok) {
            setMessage(err ?? "Upload failed");
            break;
          }
          const media =
            typeof data === "object" && data !== null && "media" in data ? (data as { media: MediaRow }).media : null;
          if (media) {
            setItems((prev) => [media, ...prev]);
          }
        }
        router.refresh();
      } finally {
        setUploading(false);
      }
    },
    [router, storageReady],
  );

  async function handleCopy(id: string, url: string) {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this asset from storage and the library?")) return;
    const result = await deleteMediaAsset(id);
    if (result.success) {
      setItems((prev) => prev.filter((m) => m.id !== id));
      router.refresh();
    } else {
      setMessage(result.error);
    }
  }

  return (
    <>
      {!storageReady ? (
        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Uploads are disabled until R2 is configured. Set{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">R2_ACCOUNT_ID</code>,{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">R2_ACCESS_KEY_ID</code>,{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">R2_SECRET_ACCESS_KEY</code>,{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">R2_BUCKET_NAME</code>, and{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">R2_PUBLIC_BASE_URL</code> in{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code>.
        </p>
      ) : null}

      <MediaDropzone onFilesSelected={uploadFiles} disabled={uploading || !storageReady} className="mt-6" />

      {message ? <p className="mt-4 text-sm text-destructive">{message}</p> : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {items.map((item) => (
          <MediaAssetCard
            key={item.id}
            filename={item.filename}
            imageUrl={item.url}
            sizeLabel={formatBytes(item.size)}
            uploadedLabel={formatUploadedAt(item.uploaded_at)}
            copied={copiedId === item.id}
            disabled={uploading}
            onCopyUrl={() => handleCopy(item.id, item.url)}
            onDelete={() => handleDelete(item.id)}
            imageAlt={item.alt_text ?? undefined}
          />
        ))}
      </div>

      {items.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          No files yet. {storageReady ? "Upload images to see them here." : "Configure R2 to enable uploads."}
        </p>
      ) : null}
    </>
  );
}
