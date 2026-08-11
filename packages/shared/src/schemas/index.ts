// Barrel for all domain Zod schemas and their inferred types. These are the
// single source of truth for content types across the web and admin apps.
export { heroSchema, heroRowSchema, type HeroFormData, type Hero } from "./hero";
export {
  aboutSchema,
  aboutRowSchema,
  highlightSchema,
  type AboutFormData,
  type About,
  type Highlight,
} from "./about";
export {
  experienceSchema,
  experienceRowSchema,
  locationTypeEnum,
  contractTypeEnum,
  CONTRACT_TYPE_LABELS,
  getContractTypeLabel,
  filterExperienceForResume,
  type ContractType,
  type ExperienceFormData,
  type Experience,
} from "./experience";
export {
  projectSchema,
  projectRowSchema,
  projectTypeEnum,
  filterProjectsForResume,
  type ProjectFormData,
  type Project,
  type ProjectType,
} from "./project";
export {
  skillSchema,
  skillRowSchema,
  skillCategoryEnum,
  type SkillFormData,
  type Skill,
  type SkillCategory,
} from "./skill";
export {
  resumeSchema,
  resumeRowSchema,
  educationSchema,
  certificationSchema,
  resumeVariantSchema,
  resumeVariantRowSchema,
  type ResumeFormData,
  type Resume,
  type ResumeVariant,
  type ResumeVariantFormData,
  type Education,
  type Certification,
} from "./resume";
export {
  resumeGenLanguageEnum,
  resumeGenToneEnum,
  resumeGenLengthEnum,
  resumeGenSourceEnum,
  type ResumeGenLanguage,
  type ResumeGenTone,
  type ResumeGenLength,
  type ResumeGenSource,
  type ResumeGenerationUsage,
  type ResumeGeneration,
  type ResumeGenerationInsert,
  type ResumeGenerationUpdate,
} from "./resume-generation";
export {
  testimonialSchema,
  testimonialRowSchema,
  DEFAULT_LINKEDIN_RECOMMENDATIONS_URL,
  RECOMMENDATION_DESCRIPTION_PREVIEW_MAX,
  RECOMMENDATIONS_SECTION_MAX,
  truncateRecommendationDescription,
  type TestimonialFormData,
  type Testimonial,
} from "./testimonial";
export {
  siteConfigSchema,
  siteConfigRowSchema,
  socialLinkSchema,
  navLinkSchema,
  type SiteConfigFormData,
  type SiteConfig,
  type SocialLink,
  type NavLink,
} from "./site-config";
export { contactSchema, type ContactFormData } from "./contact";
export { mediaInsertSchema, mediaRowSchema, type MediaInsert, type Media } from "./media";
