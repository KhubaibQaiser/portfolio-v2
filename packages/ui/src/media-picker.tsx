"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Upload, X } from "lucide-react";
import { cn } from "@portfolio/shared/utils";
import type { Media } from "@portfolio/shared/schemas";
import { Button } from "./button";

export type MediaPickerProps = {
  /** Library images to choose from (newest first). */
  items: Media[];
  /** Allow choosing several images; otherwise a click selects exactly one. */
  multiple?: boolean;
  title?: string;
  /** Urls shown as already in use; they cannot be picked again. */
  disabledUrls?: string[];
  /** Upload a new image and return it; omit to hide the upload button. */
  onUpload?: (file: File) => Promise<Media | null>;
  onConfirm: (items: Media[]) => void;
  onClose: () => void;
};

/** Modal grid for choosing images from the media library. */
export function MediaPicker({
  items,
  multiple = false,
  title = "Choose from media library",
  disabledUrls = [],
  onUpload,
  onConfirm,
  onClose,
}: MediaPickerProps) {
  const [library, setLibrary] = useState(items);
  const [selected, setSelected] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggle(id: string) {
    setSelected((prev) =>
      multiple
        ? prev.includes(id)
          ? prev.filter((x) => x !== id)
          : [...prev, id]
        : [id],
    );
  }

  async function handleFiles(files: FileList | null) {
    if (!onUpload || !files) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const media = await onUpload(file);
        if (media) {
          setLibrary((prev) => [media, ...prev]);
          toggle(media.id);
        }
      }
    } finally {
      setUploading(false);
    }
  }

  const chosen = library.filter((item) => selected.includes(item.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-background border-border flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border"
      >
        <div className="border-border flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          {library.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              No images yet.{onUpload ? " Upload one to get started." : ""}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {library.map((item) => {
                const used = disabledUrls.includes(item.url);
                const isSelected = selected.includes(item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={used}
                      aria-pressed={isSelected}
                      aria-label={item.alt_text || item.filename}
                      onClick={() => toggle(item.id)}
                      className={cn(
                        "bg-muted focus-visible:ring-accent relative block aspect-square w-full overflow-hidden rounded-lg border-2 focus-visible:ring-2 focus-visible:outline-none",
                        isSelected ? "border-accent" : "border-transparent",
                        used && "opacity-40",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- library thumbnails */}
                      <img
                        src={item.url}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      {isSelected && (
                        <span className="bg-accent text-accent-foreground absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-border flex items-center justify-between gap-2 border-t p-4">
          {onUpload ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple={multiple}
                className="hidden"
                onChange={(e) => {
                  void handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading…" : "Upload"}
              </Button>
            </>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="accent"
              size="sm"
              disabled={chosen.length === 0}
              onClick={() => onConfirm(chosen)}
            >
              {multiple
                ? chosen.length > 0
                  ? `Add ${chosen.length} image${chosen.length === 1 ? "" : "s"}`
                  : "Add images"
                : "Use image"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
