"use client";

import { useState } from "react";
import { Upload, Trash2, Copy, CheckCircle, Image as ImageIcon } from "lucide-react";
type MediaItem = {
  id: string;
  filename: string;
  url: string;
  size: string;
  uploaded: string;
};

const mockMedia: MediaItem[] = [
  { id: "1", filename: "profile-photo.jpg", url: "#", size: "245 KB", uploaded: "2 days ago" },
  { id: "2", filename: "shopsense-logo.png", url: "#", size: "12 KB", uploaded: "3 days ago" },
  { id: "3", filename: "geo-dashboard.png", url: "#", size: "420 KB", uploaded: "1 week ago" },
];

export default function MediaPage() {
  const [copied, setCopied] = useState<string | null>(null);

  function handleCopy(id: string, url: string) {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Media Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload and manage images stored in Cloudflare R2.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
          <Upload className="h-4 w-4" />
          Upload
        </button>
      </div>

      {/* Upload dropzone */}
      <div className="mt-6 rounded-xl border-2 border-dashed border-border p-12 text-center">
        <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground/30" />
        <p className="mt-3 text-sm text-muted-foreground">
          Drag & drop images here, or click Upload
        </p>
        <p className="mt-1 text-xs text-muted-foreground/50">
          PNG, JPG, WebP up to 5MB
        </p>
      </div>

      {/* Media grid */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {mockMedia.map((item) => (
          <div
            key={item.id}
            className="group rounded-xl border border-border/50 bg-muted/20 p-4 transition-colors hover:border-accent/20"
          >
            <div className="aspect-video rounded-lg bg-muted" />
            <div className="mt-3">
              <p className="truncate text-sm font-medium">{item.filename}</p>
              <p className="text-xs text-muted-foreground">
                {item.size} · {item.uploaded}
              </p>
            </div>
            <div className="mt-2 flex items-center gap-1">
              <button
                onClick={() => handleCopy(item.id, item.url)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
              >
                {copied === item.id ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                Copy URL
              </button>
              <button className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-red-500/10 hover:text-red-500">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
