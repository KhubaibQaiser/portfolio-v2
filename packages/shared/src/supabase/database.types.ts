export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      hero: {
        Row: {
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
        Insert: Omit<
          Database["public"]["Tables"]["hero"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["hero"]["Insert"]>;
      };
      about: {
        Row: {
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
        Insert: Omit<
          Database["public"]["Tables"]["about"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["about"]["Insert"]>;
      };
      experience: {
        Row: {
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
        Insert: Omit<
          Database["public"]["Tables"]["experience"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["experience"]["Insert"]>;
      };
      projects: {
        Row: {
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
        Insert: Omit<
          Database["public"]["Tables"]["projects"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
      };
      skills: {
        Row: {
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
        Insert: Omit<
          Database["public"]["Tables"]["skills"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["skills"]["Insert"]>;
      };
      resume: {
        Row: {
          id: string;
          default_summary: string;
          education: Json;
          certifications: Json;
          visible_sections: Json;
          is_projects_visible: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["resume"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["resume"]["Insert"]>;
      };
      resume_variants: {
        Row: {
          id: string;
          name: string;
          summary_override: string | null;
          hidden_experience_ids: string[];
          hidden_skill_ids: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["resume_variants"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["resume_variants"]["Insert"]
        >;
      };
      testimonials: {
        Row: {
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
        Insert: Omit<
          Database["public"]["Tables"]["testimonials"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["testimonials"]["Insert"]
        >;
      };
      site_config: {
        Row: {
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
        Insert: Omit<
          Database["public"]["Tables"]["site_config"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["site_config"]["Insert"]>;
      };
      media: {
        Row: {
          id: string;
          filename: string;
          url: string;
          alt_text: string | null;
          size: number;
          mime_type: string;
          uploaded_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["media"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["media"]["Insert"]>;
      };
      content_embeddings: {
        Row: {
          id: string;
          chunk_text: string;
          embedding: number[];
          source_table: string;
          source_id: string;
          metadata: Json;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["content_embeddings"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["content_embeddings"]["Insert"]
        >;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
