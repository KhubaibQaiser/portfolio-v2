export type {
  Hero,
  About,
  Experience,
  Project,
  ProjectType,
  Skill,
  SkillCategory,
  Resume,
  ResumeVariant,
  Education,
  Certification,
  Testimonial,
  BlogPost,
  SiteConfig,
  SocialLink,
  NavLink,
} from "../schemas";

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };
