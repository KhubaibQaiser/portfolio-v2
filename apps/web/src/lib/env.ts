import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Validated environment for the web app. All vars are optional because the app
 * degrades gracefully (analytics no-op, chat returns 503, fixtures back the
 * data layer locally); marking required vars is deferred until CI provides them
 * and sets SKIP_ENV_VALIDATION for build-only steps.
 *
 * Imported from next.config.ts so validation runs at build/start.
 */
export const env = createEnv({
  server: {
    // AI
    GROQ_API_KEY: z.string().min(1).optional(),
    // Revalidation webhook shared secret (also set in apps/admin)
    REVALIDATE_SECRET: z.string().min(1).optional(),
    // Chat rate limit tuning (parsed as ints by chat-rate-limit.ts)
    CHAT_RATE_LIMIT_MAX: z.string().optional(),
    CHAT_RATE_LIMIT_WINDOW_SEC: z.string().optional(),
    // GitHub API token for the /api/github proxy (raises rate limits)
    GITHUB_TOKEN: z.string().min(1).optional(),
    // PostHog server-side: source map upload (next.config) + event tagging
    POSTHOG_API_KEY: z.string().min(1).optional(),
    POSTHOG_PROJECT_ID: z.string().min(1).optional(),
    POSTHOG_APP_HOST: z.string().url().optional(),
    POSTHOG_ENVIRONMENT: z.string().optional(),
    // Data layer (consumed by @portfolio/data)
    DATA_BACKEND: z.enum(["fixture", "dynamo"]).optional(),
    DYNAMO_TABLE_NAME: z.string().min(1).optional(),
    DYNAMODB_LOCAL_ENDPOINT: z.string().url().optional(),
    AWS_REGION: z.string().min(1).optional(),
    S3_ENDPOINT: z.string().url().optional(),
    S3_MEDIA_BUCKET: z.string().min(1).optional(),
    // Public URL objects are served from (S3/CloudFront). Read server-side by
    // the media store and at build time for next.config image patterns.
    MEDIA_PUBLIC_BASE_URL: z.string().url().optional(),
  },
  client: {
    NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
    NEXT_PUBLIC_POSTHOG_UI_HOST: z.string().url().optional(),
    NEXT_PUBLIC_POSTHOG_ENVIRONMENT: z.string().optional(),
  },
  runtimeEnv: {
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    REVALIDATE_SECRET: process.env.REVALIDATE_SECRET,
    CHAT_RATE_LIMIT_MAX: process.env.CHAT_RATE_LIMIT_MAX,
    CHAT_RATE_LIMIT_WINDOW_SEC: process.env.CHAT_RATE_LIMIT_WINDOW_SEC,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    POSTHOG_API_KEY: process.env.POSTHOG_API_KEY,
    POSTHOG_PROJECT_ID: process.env.POSTHOG_PROJECT_ID,
    POSTHOG_APP_HOST: process.env.POSTHOG_APP_HOST,
    POSTHOG_ENVIRONMENT: process.env.POSTHOG_ENVIRONMENT,
    DATA_BACKEND: process.env.DATA_BACKEND,
    DYNAMO_TABLE_NAME: process.env.DYNAMO_TABLE_NAME,
    DYNAMODB_LOCAL_ENDPOINT: process.env.DYNAMODB_LOCAL_ENDPOINT,
    AWS_REGION: process.env.AWS_REGION,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_MEDIA_BUCKET: process.env.S3_MEDIA_BUCKET,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_POSTHOG_UI_HOST: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST,
    NEXT_PUBLIC_POSTHOG_ENVIRONMENT: process.env.NEXT_PUBLIC_POSTHOG_ENVIRONMENT,
    MEDIA_PUBLIC_BASE_URL: process.env.MEDIA_PUBLIC_BASE_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
