"use client";

import { CheckCircle, Copy, Trash2 } from "lucide-react";
import { cn } from "@portfolio/shared/utils";
import { Button } from "./button";
import { Card } from "./card";

type MediaAssetCardProps = {
  filename: string;
  imageUrl: string;
  sizeLabel: string;
  uploadedLabel: string;
  copied?: boolean;
  disabled?: boolean;
  onCopyUrl: () => void;
  onDelete: () => void;
  imageAlt?: string;
  className?: string;
};

export function MediaAssetCard({
  filename,
  imageUrl,
  sizeLabel,
  uploadedLabel,
  copied = false,
  disabled = false,
  onCopyUrl,
  onDelete,
  imageAlt,
  className,
}: MediaAssetCardProps) {
  return (
    <Card hoverable className={cn("p-4", className)}>
      <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
        <img src={imageUrl} alt={imageAlt ?? filename} className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="mt-3">
        <p className="truncate text-sm font-medium" title={filename}>
          {filename}
        </p>
        <p className="text-xs text-muted-foreground">
          {sizeLabel} · {uploadedLabel}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={onCopyUrl}
          className="text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <CheckCircle className="h-3 w-3 text-green-500" aria-hidden />
          ) : (
            <Copy className="h-3 w-3" aria-hidden />
          )}
          Copy URL
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={onDelete}
          className="text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
          aria-label={`Delete ${filename}`}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </Card>
  );
}
