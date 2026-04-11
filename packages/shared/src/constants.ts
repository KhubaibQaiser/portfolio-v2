/**
 * Skill category display labels — used by both admin editor and web UI.
 * This is configuration, not data, so it stays here rather than in Supabase.
 */
export const SKILL_CATEGORIES = {
  frontend: "Frontend",
  mobile: "Mobile",
  backend: "Backend / API",
  cloud: "Cloud / AWS",
  devops: "DevOps / CI",
  testing: "Testing",
  tools: "Tools",
  build: "Build",
  state: "State / Data",
  cms: "CMS",
  legacy: "Legacy",
} as const;

/**
 * Admin email allowlist — enforced by admin middleware.
 * Add emails here to grant dashboard access.
 */
export const ADMIN_ALLOWED_EMAILS = [
  "khubaib.dev@gmail.com",
] as const;

export type AdminAllowedEmail = (typeof ADMIN_ALLOWED_EMAILS)[number];

export function isAllowedAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return (ADMIN_ALLOWED_EMAILS as readonly string[]).includes(
    email.toLowerCase(),
  );
}
