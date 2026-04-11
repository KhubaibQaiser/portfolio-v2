export const SITE = {
  name: "Khubaib Qaiser",
  title: "Senior Software Engineer",
  url: "https://khubaibqaiser.com",
  email: "khubaib.dev@gmail.com",
  location: "Islamabad, Pakistan",
  description:
    "Senior Software Engineer with 11+ years of experience specializing in React, Next.js, TypeScript, React Native, and cloud infrastructure (AWS, GCP). Available for senior/staff engineering roles, remote worldwide.",
} as const;

export const SOCIAL_LINKS = {
  github: "https://github.com/khubaibqaiser",
  linkedin: "https://linkedin.com/in/khubaib-qaiser",
  twitter: "https://twitter.com/khubaibqaiser",
  instagram: "https://instagram.com/khubaibqaiser",
} as const;

export const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Skills", href: "#skills" },
  { label: "Experience", href: "#experience" },
  { label: "Projects", href: "#projects" },
  { label: "Contact", href: "#contact" },
] as const;

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

export const COMPANIES = [
  "Shopsense AI",
  "Achieve",
  "Tradeblock.us",
  "GudangAda",
  "STOQO",
  "Knowledge Platform",
] as const;

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
