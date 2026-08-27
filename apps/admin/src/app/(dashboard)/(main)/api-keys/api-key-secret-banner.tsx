"use client";

import { useState } from "react";

type ApiKeySecretBannerProps = {
  apiKey: string;
  onDismiss: () => void;
};

export function ApiKeySecretBanner({ apiKey, onDismiss }: ApiKeySecretBannerProps) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="border-amber-500/40 bg-amber-500/10 space-y-3 rounded-lg border p-4">
      <div>
        <h2 className="font-semibold text-amber-900 dark:text-amber-100">
          Copy your new API key
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          This is the only time the full key is shown. Use{" "}
          <code className="text-xs">Authorization: Bearer …</code> in Claude.ai or n8n.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="bg-background border-border flex-1 overflow-x-auto rounded border px-3 py-2 text-xs">
          {apiKey}
        </code>
        <button
          type="button"
          className="border-border hover:bg-muted rounded-md border px-3 py-2 text-sm"
          onClick={async () => {
            await navigator.clipboard.writeText(apiKey);
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground px-3 py-2 text-sm"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
