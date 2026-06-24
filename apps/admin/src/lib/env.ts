import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Validated environment for the admin app. Vars are optional to keep builds
 * green without secrets (set SKIP_ENV_VALIDATION for build-only steps); the
 * Supabase auth vars are effectively required at runtime.
 *
 * Imported from next.config.ts so validation runs at build/start.
 */
export const env = createEnv({
  server: {
    // Revalidation webhook shared secret (matches apps/web)
    REVALIDATE_SECRET: z.string().min(1).optional(),
    // Resume AI
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    GROQ_API_KEY: z.string().min(1).optional(),
    RESUME_GEN_DAILY_USD_CAP: z.string().optional(),
    // Data layer (consumed by @portfolio/data)
    DATA_BACKEND: z.enum(["fixture", "dynamo"]).optional(),
    DYNAMO_TABLE_NAME: z.string().min(1).optional(),
    DYNAMODB_LOCAL_ENDPOINT: z.string().url().optional(),
    AWS_REGION: z.string().min(1).optional(),
    S3_ENDPOINT: z.string().url().optional(),
    S3_MEDIA_BUCKET: z.string().min(1).optional(),
    MEDIA_PUBLIC_BASE_URL: z.string().url().optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
    // Public portfolio URL used to trigger revalidation
    NEXT_PUBLIC_WEB_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    REVALIDATE_SECRET: process.env.REVALIDATE_SECRET,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    RESUME_GEN_DAILY_USD_CAP: process.env.RESUME_GEN_DAILY_USD_CAP,
    DATA_BACKEND: process.env.DATA_BACKEND,
    DYNAMO_TABLE_NAME: process.env.DYNAMO_TABLE_NAME,
    DYNAMODB_LOCAL_ENDPOINT: process.env.DYNAMODB_LOCAL_ENDPOINT,
    AWS_REGION: process.env.AWS_REGION,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_MEDIA_BUCKET: process.env.S3_MEDIA_BUCKET,
    MEDIA_PUBLIC_BASE_URL: process.env.MEDIA_PUBLIC_BASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
