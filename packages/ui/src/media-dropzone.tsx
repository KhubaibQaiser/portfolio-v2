"use client";

import { useCallback, useId, useRef, useState, type DragEvent } from "react";
import { Upload } from "lucide-react";
import { cn } from "@portfolio/shared/utils";

const DEFAULT_ACCEPT = "image/png,image/jpeg,image/webp";

type MediaDropzoneProps = {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  accept?: string;
  maxSizeBytes?: number;
  hint?: string;
  className?: string;
};

export function MediaDropzone({
  onFilesSelected,
  disabled = false,
  accept = DEFAULT_ACCEPT,
  maxSizeBytes = 5 * 1024 * 1024,
  hint = "PNG, JPG, WebP up to 5MB",
  className,
}: MediaDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndEmit = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const allowed = new Set(accept.split(",").map((s) => s.trim()));
      const rejected: string[] = [];
      const ok: File[] = [];
      for (const f of files) {
        if (!allowed.has(f.type)) {
          rejected.push(`${f.name}: unsupported type`);
          continue;
        }
        if (f.size > maxSizeBytes) {
          rejected.push(`${f.name}: exceeds size limit`);
          continue;
        }
        ok.push(f);
      }
      if (rejected.length > 0) {
        setError(rejected.join(" · "));
      } else {
        setError(null);
      }
      if (ok.length > 0) onFilesSelected(ok);
    },
    [accept, maxSizeBytes, onFilesSelected],
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (disabled) return;
      if (e.dataTransfer.files?.length) validateAndEmit(e.dataTransfer.files);
    },
    [disabled, validateAndEmit],
  );

  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={inputId} className="sr-only">
        Upload images
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files?.length) validateAndEmit(e.target.files);
          e.target.value = "";
        }}
      />

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled) inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
        onDrop={onDrop}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        className={cn(
          "cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-colors",
          dragActive ? "border-accent bg-accent/5" : "border-border",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <Upload className="mx-auto h-8 w-8 text-muted-foreground/40" aria-hidden />
        <p className="mt-3 text-sm text-muted-foreground">Drag & drop images here, or click to upload</p>
        <p className="mt-1 text-xs text-muted-foreground/50">{hint}</p>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
