"use client";

import { useState } from "react";
import { useToast } from "@/components/toast/toast-provider";
import { deleteMcpApiKey } from "@/lib/api-key-actions";
import { runServerAction } from "@/lib/run-server-action";

type ApiKeyRevokeButtonProps = {
  keyId: string;
  name: string;
  onRevoked: () => void;
};

export function ApiKeyRevokeButton({ keyId, name, onRevoked }: ApiKeyRevokeButtonProps) {
  const toast = useToast();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      className="text-destructive hover:text-destructive/80 text-sm font-medium disabled:opacity-50"
      onClick={async () => {
        if (!window.confirm(`Revoke API key "${name}"? This cannot be undone.`)) return;
        setPending(true);
        try {
          const result = await runServerAction(
            () => deleteMcpApiKey(keyId),
            toast,
            { successMessage: "API key revoked" },
          );
          if (result.success) onRevoked();
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? "Revoking…" : "Revoke"}
    </button>
  );
}
