"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2, Clipboard } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "paste" | "pdf";

type Props = {
  value: string;
  source: Mode;
  onChange: (value: string, source: Mode) => void;
  disabled?: boolean;
};

export function JdInput({ value, source, onChange, disabled }: Props) {
  const [mode, setMode] = useState<Mode>(source);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/resume/extract-pdf", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "PDF extraction failed");
      onChange(json.text as string, "pdf");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setMode("paste")}
          className={cn(
            "rounded-md px-2.5 py-1 transition-colors",
            mode === "paste"
              ? "bg-accent/10 font-medium text-accent"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          <Clipboard className="mr-1 inline-block h-3.5 w-3.5" /> Paste
        </button>
        <button
          type="button"
          onClick={() => setMode("pdf")}
          className={cn(
            "rounded-md px-2.5 py-1 transition-colors",
            mode === "pdf"
              ? "bg-accent/10 font-medium text-accent"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          <FileUp className="mr-1 inline-block h-3.5 w-3.5" /> Upload PDF
        </button>
        <span className="ml-auto text-muted-foreground">
          {value.length.toLocaleString()} chars
        </span>
      </div>

      {mode === "paste" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value, "paste")}
          rows={14}
          disabled={disabled}
          placeholder="Paste the job description here…"
          className={cn(
            "w-full rounded-lg border border-border bg-muted/30 px-4 py-2.5",
            "text-sm focus:border-accent focus:outline-hidden",
          )}
        />
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 p-6 text-center">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || disabled}
            className={cn(
              "mx-auto flex items-center gap-2 rounded-lg bg-accent px-4 py-2",
              "text-sm font-medium text-accent-foreground transition-opacity",
              "hover:opacity-90 disabled:opacity-50",
            )}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4" />
            )}
            {uploading ? "Extracting…" : "Choose PDF"}
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            Max 2MB, text-based PDFs only.
          </p>
          {value && !uploading && (
            <p className="mt-3 text-xs text-muted-foreground">
              Extracted {value.length.toLocaleString()} chars — switch to Paste
              to edit.
            </p>
          )}
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
