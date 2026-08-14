"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onClick: () => void;
};

export function CopyButton({ onClick }: Props) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        onClick();
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
      className={cn(
        "border-border flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs",
        "hover:bg-muted",
      )}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" /> Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" /> Copy
        </>
      )}
    </button>
  );
}
