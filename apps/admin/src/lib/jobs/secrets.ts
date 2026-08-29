import { getSecretString } from "@portfolio/ai/load-api-keys";

export async function loadOptionalSecret(envName: string): Promise<string | null> {
  const direct = process.env[envName.replace(/_SECRET_ARN$/, "")];
  if (direct && direct.trim().length > 0) return direct.trim();
  const arn = process.env[envName];
  if (!arn) return null;
  try {
    const value = await getSecretString(arn);
    return value.trim().length > 0 ? value.trim() : null;
  } catch {
    return null;
  }
}

export function adminAppOrigin(): string {
  return (
    process.env.APP_ORIGIN ?? process.env.ADMIN_APP_ORIGIN ?? "http://localhost:3001"
  );
}

export function jobMailRecipients(): { from: string; to: string } | null {
  const from = process.env.CONTACT_FROM_EMAIL;
  const to =
    process.env.CONTACT_TO_EMAIL ?? process.env.ADMIN_ALLOWED_EMAILS?.split(",")[0];
  if (!from || !to) return null;
  return { from: from.trim(), to: to.trim() };
}
