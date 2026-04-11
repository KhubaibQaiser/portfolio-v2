export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type HeroRow = {
  id: string;
  greeting: string;
  name: string;
  headline: string;
  subtitle: string[];
  value_proposition: string;
  cta_primary_text: string;
  cta_secondary_text: string;
  created_at: string;
  updated_at: string;
};

type AboutRow = {
  id: string;
  bio: string;
  photo_url: string;
  status: "available" | "unavailable" | "open";
  timezone: string;
  years_experience: number;
  companies_count: number;
  countries_count: number;
  projects_count: number;
  users_impacted: string;
  industries: string[];
  languages: string[];
  created_at: string;
  updated_at: string;
};

type ExperienceRow = {
  id: string;
  company: string;
  role: string;
  location: string;
  location_type: "remote" | "onsite" | "hybrid";
  start_date: string;
  end_date: string | null;
  description: string;
  tech_tags: string[];
  logo_url: string | null;
  company_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type ProjectsRow = {
  id: string;
  title: string;
  slug: string;
  description: string;
  summary: string;
  cover_url: string | null;
  tech_tags: string[];
  role: string;
  type: "web" | "mobile" | "game" | "open-source" | "other";
  github_url: string | null;
  live_url: string | null;
  playstore_url: string | null;
  appstore_url: string | null;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type SkillsRow = {
  id: string;
  name: string;
  category: string;
  proficiency: number;
  icon: string | null;
  years: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type ResumeRow = {
  id: string;
  default_summary: string;
  education: Json;
  certifications: Json;
  visible_sections: Json;
  is_projects_visible: boolean;
  created_at: string;
  updated_at: string;
};

type ResumeVariantsRow = {
  id: string;
  name: string;
  summary_override: string | null;
  hidden_experience_ids: string[];
  hidden_skill_ids: string[];
  created_at: string;
  updated_at: string;
};

type TestimonialsRow = {
  id: string;
  quote: string;
  author_name: string;
  author_title: string;
  company: string;
  avatar_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type SiteConfigRow = {
  id: string;
  name: string;
  email: string;
  location: string;
  title: string;
  description: string;
  social_links: Json;
  nav_links: Json;
  created_at: string;
  updated_at: string;
};

type MediaRow = {
  id: string;
  filename: string;
  url: string;
  alt_text: string | null;
  size: number;
  mime_type: string;
  uploaded_at: string;
};

type ContentEmbeddingsRow = {
  id: string;
  chunk_text: string;
  embedding: number[];
  source_table: string;
  source_id: string;
  metadata: Json;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      hero: {
        Row: HeroRow;
        Insert: Omit<HeroRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<HeroRow, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      about: {
        Row: AboutRow;
        Insert: Omit<AboutRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<AboutRow, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      experience: {
        Row: ExperienceRow;
        Insert: Omit<ExperienceRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ExperienceRow, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      projects: {
        Row: ProjectsRow;
        Insert: Omit<ProjectsRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ProjectsRow, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      skills: {
        Row: SkillsRow;
        Insert: Omit<SkillsRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<SkillsRow, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      resume: {
        Row: ResumeRow;
        Insert: Omit<ResumeRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ResumeRow, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      resume_variants: {
        Row: ResumeVariantsRow;
        Insert: Omit<ResumeVariantsRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ResumeVariantsRow, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      testimonials: {
        Row: TestimonialsRow;
        Insert: Omit<TestimonialsRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<TestimonialsRow, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      site_config: {
        Row: SiteConfigRow;
        Insert: Omit<SiteConfigRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<SiteConfigRow, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      media: {
        Row: MediaRow;
        Insert: Omit<MediaRow, "id">;
        Update: Partial<Omit<MediaRow, "id">>;
        Relationships: [];
      };
      content_embeddings: {
        Row: ContentEmbeddingsRow;
        Insert: Omit<ContentEmbeddingsRow, "id" | "created_at">;
        Update: Partial<Omit<ContentEmbeddingsRow, "id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
