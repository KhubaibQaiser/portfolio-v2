import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Validated environment for the admin app. Vars are optional to keep builds
 * green without secrets (set SKIP_ENV_VALIDATION for build-only steps); auth
 * vars are effectively required at runtime (the auth helpers throw when unset).
 *
 * Imported from next.config.ts so validation runs at build/start.
 */
export const env = createEnv({
  server: {
    APP_ORIGIN: z.string().url().optional(),
    BETTER_AUTH_URL: z.string().url().optional(),
    BETTER_AUTH_SECRET: z.string().min(32).optional(),
    BETTER_AUTH_SECRET_ARN: z.string().min(1).optional(),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    GOOGLE_OAUTH_SECRET_ARN: z.string().min(1).optional(),
    ADMIN_ALLOWED_EMAILS: z.string().optional(),
    GROQ_API_KEY_SECRET_ARN: z.string().min(1).optional(),
    ANTHROPIC_API_KEY_SECRET_ARN: z.string().min(1).optional(),
    RESEND_API_KEY_SECRET_ARN: z.string().min(1).optional(),
    JOBSPIPE_API_KEY_SECRET_ARN: z.string().min(1).optional(),
    CONTACT_TO_EMAIL: z.string().email().optional(),
    CONTACT_FROM_EMAIL: z.string().min(1).optional(),
    RESUME_GEN_DAILY_USD_CAP: z.string().optional(),
    DATA_BACKEND: z.enum(["fixture", "dynamo"]).optional(),
    DYNAMO_TABLE_PREFIX: z.string().min(1).optional(),
    DYNAMODB_LOCAL_ENDPOINT: z.string().url().optional(),
    AWS_REGION: z.string().min(1).optional(),
    S3_ENDPOINT: z.string().url().optional(),
    S3_MEDIA_BUCKET: z.string().min(1).optional(),
    MEDIA_PUBLIC_BASE_URL: z.string().url().optional(),
  },
  client: {},
  runtimeEnv: {
    APP_ORIGIN: process.env.APP_ORIGIN,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_SECRET_ARN: process.env.BETTER_AUTH_SECRET_ARN,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_OAUTH_SECRET_ARN: process.env.GOOGLE_OAUTH_SECRET_ARN,
    ADMIN_ALLOWED_EMAILS: process.env.ADMIN_ALLOWED_EMAILS,
    GROQ_API_KEY_SECRET_ARN: process.env.GROQ_API_KEY_SECRET_ARN,
    ANTHROPIC_API_KEY_SECRET_ARN: process.env.ANTHROPIC_API_KEY_SECRET_ARN,
    RESEND_API_KEY_SECRET_ARN: process.env.RESEND_API_KEY_SECRET_ARN,
    JOBSPIPE_API_KEY_SECRET_ARN: process.env.JOBSPIPE_API_KEY_SECRET_ARN,
    CONTACT_TO_EMAIL: process.env.CONTACT_TO_EMAIL,
    CONTACT_FROM_EMAIL: process.env.CONTACT_FROM_EMAIL,
    RESUME_GEN_DAILY_USD_CAP: process.env.RESUME_GEN_DAILY_USD_CAP,
    DATA_BACKEND: process.env.DATA_BACKEND,
    DYNAMO_TABLE_PREFIX: process.env.DYNAMO_TABLE_PREFIX,
    DYNAMODB_LOCAL_ENDPOINT: process.env.DYNAMODB_LOCAL_ENDPOINT,
    AWS_REGION: process.env.AWS_REGION,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_MEDIA_BUCKET: process.env.S3_MEDIA_BUCKET,
    MEDIA_PUBLIC_BASE_URL: process.env.MEDIA_PUBLIC_BASE_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
