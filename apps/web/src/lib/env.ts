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
    GROQ_API_KEY_SECRET_ARN: z.string().min(1).optional(),
    CHAT_RATE_LIMIT_MAX: z.string().optional(),
    CHAT_RATE_LIMIT_WINDOW_SEC: z.string().optional(),
    GITHUB_TOKEN: z.string().min(1).optional(),
    POSTHOG_API_KEY: z.string().min(1).optional(),
    POSTHOG_PROJECT_ID: z.string().min(1).optional(),
    POSTHOG_APP_HOST: z.string().url().optional(),
    POSTHOG_ENVIRONMENT: z.string().optional(),
    DATA_BACKEND: z.enum(["fixture", "dynamo"]).optional(),
    DYNAMO_TABLE_PREFIX: z.string().min(1).optional(),
    DYNAMODB_LOCAL_ENDPOINT: z.string().url().optional(),
    AWS_REGION: z.string().min(1).optional(),
    S3_ENDPOINT: z.string().url().optional(),
    S3_MEDIA_BUCKET: z.string().min(1).optional(),
    MEDIA_PUBLIC_BASE_URL: z.string().url().optional(),
    OPEN_NEXT_BUILD_ID: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
    NEXT_PUBLIC_POSTHOG_UI_HOST: z.string().url().optional(),
    NEXT_PUBLIC_POSTHOG_ENVIRONMENT: z.string().optional(),
  },
  runtimeEnv: {
    GROQ_API_KEY_SECRET_ARN: process.env.GROQ_API_KEY_SECRET_ARN,
    CHAT_RATE_LIMIT_MAX: process.env.CHAT_RATE_LIMIT_MAX,
    CHAT_RATE_LIMIT_WINDOW_SEC: process.env.CHAT_RATE_LIMIT_WINDOW_SEC,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    POSTHOG_API_KEY: process.env.POSTHOG_API_KEY,
    POSTHOG_PROJECT_ID: process.env.POSTHOG_PROJECT_ID,
    POSTHOG_APP_HOST: process.env.POSTHOG_APP_HOST,
    POSTHOG_ENVIRONMENT: process.env.POSTHOG_ENVIRONMENT,
    DATA_BACKEND: process.env.DATA_BACKEND,
    DYNAMO_TABLE_PREFIX: process.env.DYNAMO_TABLE_PREFIX,
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
    OPEN_NEXT_BUILD_ID: process.env.OPEN_NEXT_BUILD_ID,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
