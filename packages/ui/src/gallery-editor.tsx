"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "./button";

export type GalleryImage = { url: string; alt: string };

export type GalleryEditorProps = {
  images: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
  /** Open the media picker. */
  onAdd: () => void;
  max?: number;
};

/** Ordered list of images with alt text, reorder and remove controls. */
export function GalleryEditor({ images, onChange, onAdd, max = 12 }: GalleryEditorProps) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(next);
  };

  return (
    <div>
      {images.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No gallery images. The cover is shown on its own.
        </p>
      ) : (
        <ol className="space-y-2">
          {images.map((image, i) => (
            <li
              key={image.url}
              className="border-border/50 bg-muted/20 flex items-center gap-3 rounded-lg border p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
              <img
                src={image.url}
                alt=""
                className="bg-muted h-14 w-20 shrink-0 rounded-md object-cover"
              />
              <input
                value={image.alt}
                onChange={(e) =>
                  onChange(
                    images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)),
                  )
                }
                aria-label={`Alt text for image ${i + 1}`}
                placeholder="Describe the image"
                maxLength={200}
                className="border-border bg-muted/30 focus:border-accent min-w-0 flex-1 rounded-md border px-3 py-1.5 text-sm focus:outline-hidden"
              />
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  aria-label={`Move image ${i + 1} up`}
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                  className="hover:bg-muted rounded-md p-1.5 disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Move image ${i + 1} down`}
                  disabled={i === images.length - 1}
                  onClick={() => move(i, i + 1)}
                  className="hover:bg-muted rounded-md p-1.5 disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Remove image ${i + 1}`}
                  onClick={() => onChange(images.filter((_, j) => j !== i))}
                  className="rounded-md p-1.5 hover:bg-red-500/10 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-3 flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={images.length >= max}
          onClick={onAdd}
        >
          <Plus className="h-4 w-4" />
          Add images
        </Button>
        <span className="text-muted-foreground text-xs">
          {images.length}/{max}
        </span>
      </div>
    </div>
  );
}
