"use client";

import { useState } from "react";
import type { McpApiKeyRecord } from "@portfolio/shared/ports/mcp-api-key-store";
import { ApiKeyCreateForm } from "./api-key-create-form";
import { ApiKeySecretBanner } from "./api-key-secret-banner";
import { ApiKeyRevokeButton } from "./api-key-revoke-button";

type ApiKeysListProps = {
  initialKeys: McpApiKeyRecord[];
};

export function ApiKeysList({ initialKeys }: ApiKeysListProps) {
  const [keys, setKeys] = useState(initialKeys);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  return (
    <div className="mt-8 space-y-8">
      {createdKey ? (
        <ApiKeySecretBanner apiKey={createdKey} onDismiss={() => setCreatedKey(null)} />
      ) : null}

      <ApiKeyCreateForm
        onCreated={(result) => {
          setKeys((current) => [result.record, ...current]);
          setCreatedKey(result.key);
        }}
      />

      <div className="border-border overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-border border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Prefix</th>
              <th className="px-4 py-3 text-left font-medium">Rate limit</th>
              <th className="px-4 py-3 text-left font-medium">Created</th>
              <th className="px-4 py-3 text-left font-medium">Expires</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted-foreground px-4 py-8 text-center">
                  No API keys yet. Create one for Claude.ai or n8n.
                </td>
              </tr>
            ) : (
              keys.map((key) => (
                <tr key={key.id} className="border-border border-b last:border-b-0">
                  <td className="px-4 py-3 font-medium">{key.name}</td>
                  <td className="text-muted-foreground px-4 py-3 font-mono text-xs">
                    {key.prefix}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {key.rateLimitMax} / {key.rateLimitWindowSec}s
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {key.expiresAt
                      ? new Date(key.expiresAt).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ApiKeyRevokeButton
                      keyId={key.id}
                      name={key.name}
                      onRevoked={() =>
                        setKeys((current) => current.filter((k) => k.id !== key.id))
                      }
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
