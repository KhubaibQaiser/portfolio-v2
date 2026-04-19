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

export type HeroTopTech = {
  id: string;
  label: string;
  iconKey: string;
  brandColor: string | null;
};

/**
 * Curated hero marquee stack (manual order by preference).
 */
export const HERO_TOP_TECHS: HeroTopTech[] = [
  { id: "react", label: "React", iconKey: "SiReact", brandColor: "#61DAFB" },
  { id: "nextjs", label: "Next.js", iconKey: "SiNextdotjs", brandColor: "#000000" },
  { id: "typescript", label: "TypeScript", iconKey: "SiTypescript", brandColor: "#3178C6" },
  {
    id: "tanstack",
    label: "TanStack",
    iconKey: "SiTanstack",
    brandColor: "#FF4154",
  },
  { id: "nodejs", label: "Node.js", iconKey: "SiNodedotjs", brandColor: "#5FA04E" },
  { id: "graphql", label: "GraphQL", iconKey: "SiGraphql", brandColor: "#E10098" },
  { id: "react-native", label: "React Native", iconKey: "SiReact", brandColor: "#61DAFB" },
  { id: "aws", label: "AWS", iconKey: "AwsBrand", brandColor: "#FF9900" },
  { id: "redux", label: "Redux", iconKey: "SiRedux", brandColor: "#764ABC" },
  { id: "docker", label: "Docker", iconKey: "SiDocker", brandColor: "#2496ED" },
  { id: "firebase", label: "Firebase", iconKey: "SiFirebase", brandColor: "#FFCA28" },
  { id: "tailwindcss", label: "Tailwind CSS", iconKey: "SiTailwindcss", brandColor: "#06B6D4" },
  {
    id: "posthog",
    label: "PostHog",
    iconKey: "SiPosthog",
    brandColor: "#F54E00",
  },
  { id: "vercel", label: "Vercel", iconKey: "SiVercel", brandColor: "#000000" },
  {
    id: "vercel-ai-sdk",
    label: "Vercel AI SDK",
    iconKey: "VercelAiSdkBrand",
    brandColor: "#000000",
  },
  { id: "github-actions", label: "GitHub Actions", iconKey: "SiGithubactions", brandColor: "#2088FF" },
] as const;

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
