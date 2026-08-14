"use client";

import { Loader2, Play } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  onClick: () => void;
  streaming?: boolean;
  disabled?: boolean;
  primary?: boolean;
};

export function GenButton({ label, onClick, streaming, disabled, primary }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-opacity",
        primary
          ? "bg-accent text-accent-foreground hover:opacity-90"
          : "border-border bg-muted/30 hover:bg-muted/50 border",
        "disabled:opacity-50",
      )}
    >
      {streaming ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Play className="h-3.5 w-3.5" />
      )}
      {label}
    </button>
  );
}
