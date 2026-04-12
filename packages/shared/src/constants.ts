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
 * Display order for skill category blocks (higher = earlier).
 * Priority: Frontend → Mobile → Backend → Cloud → State → everything else.
 */
export const SKILL_CATEGORY_SORT_WEIGHT: Partial<
  Record<keyof typeof SKILL_CATEGORIES, number>
> = {
  frontend: 100,
  mobile: 90,
  backend: 80,
  cloud: 70,
  state: 60,
};

export function getSkillCategorySortWeight(category: string): number {
  return SKILL_CATEGORY_SORT_WEIGHT[category as keyof typeof SKILL_CATEGORIES] ?? 0;
}

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
