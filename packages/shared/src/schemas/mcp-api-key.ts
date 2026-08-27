import { z } from "zod";

export const MCP_API_KEY_PREFIX = "mcp_ck_";

export const mcpApiKeyNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers, and hyphens");

export const mcpApiKeyCreateSchema = z.object({
  name: mcpApiKeyNameSchema,
  rateLimitMax: z.number().int().min(1).max(120),
  rateLimitWindowSec: z.number().int().min(10).max(3600),
  expiresAt: z.string().datetime().nullable().optional(),
});

export type McpApiKeyCreateFormData = z.infer<typeof mcpApiKeyCreateSchema>;

export const mcpApiKeyRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  prefix: z.string(),
  key_hash: z.string(),
  rate_limit_max: z.number().int(),
  rate_limit_window_sec: z.number().int(),
  created_at: z.string(),
  expires_at: z.string().nullable(),
});

export type McpApiKeyRow = z.infer<typeof mcpApiKeyRowSchema>;
