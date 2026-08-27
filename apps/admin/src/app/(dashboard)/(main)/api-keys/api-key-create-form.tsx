"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  mcpApiKeyCreateSchema,
  type McpApiKeyCreateFormData,
} from "@portfolio/shared/schemas/mcp-api-key";
import type { CreateMcpApiKeyResult } from "@/lib/api-key-actions";
import { createMcpApiKey } from "@/lib/api-key-actions";
import { useToast } from "@/components/toast/toast-provider";

type ApiKeyCreateFormProps = {
  onCreated: (result: Extract<CreateMcpApiKeyResult, { success: true }>) => void;
};

export function ApiKeyCreateForm({ onCreated }: ApiKeyCreateFormProps) {
  const toast = useToast();
  const [pending, setPending] = useState(false);

  const form = useForm<McpApiKeyCreateFormData>({
    resolver: zodResolver(mcpApiKeyCreateSchema),
    defaultValues: {
      name: "",
      rateLimitMax: 30,
      rateLimitWindowSec: 60,
      expiresAt: null,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setPending(true);
    try {
      const result = await createMcpApiKey(values);
      if (result.success) {
        toast.success("API key created — copy it now; it will not be shown again.");
        onCreated(result);
        form.reset({
          name: "",
          rateLimitMax: 30,
          rateLimitWindowSec: 60,
          expiresAt: null,
        });
      } else {
        toast.error(result.error);
      }
    } finally {
      setPending(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="border-border space-y-4 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Create API key</h2>
      <p className="text-muted-foreground text-sm">
        Use for Claude.ai (Authentication → None + Authorization header) or n8n.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Name</span>
          <input
            {...form.register("name")}
            placeholder="claude-ai"
            className="border-input bg-background w-full rounded-md border px-3 py-2"
          />
          {form.formState.errors.name ? (
            <span className="text-destructive text-xs">
              {form.formState.errors.name.message}
            </span>
          ) : null}
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Rate limit (requests / window sec)</span>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={120}
              {...form.register("rateLimitMax", { valueAsNumber: true })}
              className="border-input bg-background w-full rounded-md border px-3 py-2"
            />
            <input
              type="number"
              min={10}
              max={3600}
              {...form.register("rateLimitWindowSec", { valueAsNumber: true })}
              className="border-input bg-background w-full rounded-md border px-3 py-2"
            />
          </div>
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create key"}
      </button>
    </form>
  );
}
