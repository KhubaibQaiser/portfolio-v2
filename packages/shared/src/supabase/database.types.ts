export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      about: {
        Row: {
          bio: string
          companies_count: number
          countries_count: number
          created_at: string
          id: string
          industries: string[]
          languages: string[]
          photo_url: string
          projects_count: number
          status: string
          timezone: string
          updated_at: string
          users_impacted: string
          years_experience: number
        }
        Insert: {
          bio: string
          companies_count?: number
          countries_count?: number
          created_at?: string
          id?: string
          industries?: string[]
          languages?: string[]
          photo_url?: string
          projects_count?: number
          status?: string
          timezone?: string
          updated_at?: string
          users_impacted?: string
          years_experience?: number
        }
        Update: {
          bio?: string
          companies_count?: number
          countries_count?: number
          created_at?: string
          id?: string
          industries?: string[]
          languages?: string[]
          photo_url?: string
          projects_count?: number
          status?: string
          timezone?: string
          updated_at?: string
          users_impacted?: string
          years_experience?: number
        }
        Relationships: []
      }
      content_embeddings: {
        Row: {
          chunk_text: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json
          source_id: string
          source_table: string
        }
        Insert: {
          chunk_text: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          source_id: string
          source_table: string
        }
        Update: {
          chunk_text?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          source_id?: string
          source_table?: string
        }
        Relationships: []
      }
      experience: {
        Row: {
          company: string
          company_url: string | null
          contract_type: string
          created_at: string
          description: string
          end_date: string | null
          id: string
          location: string
          location_type: string
          logo_url: string | null
          role: string
          sort_order: number
          start_date: string
          tech_tags: string[]
          updated_at: string
        }
        Insert: {
          company: string
          company_url?: string | null
          contract_type?: string
          created_at?: string
          description: string
          end_date?: string | null
          id?: string
          location: string
          location_type?: string
          logo_url?: string | null
          role: string
          sort_order?: number
          start_date: string
          tech_tags?: string[]
          updated_at?: string
        }
        Update: {
          company?: string
          company_url?: string | null
          contract_type?: string
          created_at?: string
          description?: string
          end_date?: string | null
          id?: string
          location?: string
          location_type?: string
          logo_url?: string | null
          role?: string
          sort_order?: number
          start_date?: string
          tech_tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      hero: {
        Row: {
          created_at: string
          cta_primary_text: string
          cta_secondary_text: string
          greeting: string
          headline: string
          id: string
          name: string
          subtitle: string[]
          updated_at: string
          value_proposition: string
        }
        Insert: {
          created_at?: string
          cta_primary_text?: string
          cta_secondary_text?: string
          greeting?: string
          headline: string
          id?: string
          name: string
          subtitle?: string[]
          updated_at?: string
          value_proposition: string
        }
        Update: {
          created_at?: string
          cta_primary_text?: string
          cta_secondary_text?: string
          greeting?: string
          headline?: string
          id?: string
          name?: string
          subtitle?: string[]
          updated_at?: string
          value_proposition?: string
        }
        Relationships: []
      }
      media: {
        Row: {
          alt_text: string | null
          filename: string
          id: string
          mime_type: string
          size: number
          uploaded_at: string
          url: string
        }
        Insert: {
          alt_text?: string | null
          filename: string
          id?: string
          mime_type: string
          size?: number
          uploaded_at?: string
          url: string
        }
        Update: {
          alt_text?: string | null
          filename?: string
          id?: string
          mime_type?: string
          size?: number
          uploaded_at?: string
          url?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          appstore_url: string | null
          cover_url: string | null
          created_at: string
          description: string
          github_url: string | null
          id: string
          is_featured: boolean
          live_url: string | null
          playstore_url: string | null
          role: string
          slug: string
          sort_order: number
          summary: string
          tech_tags: string[]
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          appstore_url?: string | null
          cover_url?: string | null
          created_at?: string
          description: string
          github_url?: string | null
          id?: string
          is_featured?: boolean
          live_url?: string | null
          playstore_url?: string | null
          role: string
          slug: string
          sort_order?: number
          summary: string
          tech_tags?: string[]
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          appstore_url?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string
          github_url?: string | null
          id?: string
          is_featured?: boolean
          live_url?: string | null
          playstore_url?: string | null
          role?: string
          slug?: string
          sort_order?: number
          summary?: string
          tech_tags?: string[]
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      resume: {
        Row: {
          certifications: Json
          created_at: string
          default_summary: string
          education: Json
          id: string
          is_projects_visible: boolean
          updated_at: string
          visible_sections: Json
        }
        Insert: {
          certifications?: Json
          created_at?: string
          default_summary: string
          education?: Json
          id?: string
          is_projects_visible?: boolean
          updated_at?: string
          visible_sections?: Json
        }
        Update: {
          certifications?: Json
          created_at?: string
          default_summary?: string
          education?: Json
          id?: string
          is_projects_visible?: boolean
          updated_at?: string
          visible_sections?: Json
        }
        Relationships: []
      }
      resume_variants: {
        Row: {
          created_at: string
          hidden_experience_ids: string[]
          hidden_skill_ids: string[]
          id: string
          name: string
          summary_override: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          hidden_experience_ids?: string[]
          hidden_skill_ids?: string[]
          id?: string
          name: string
          summary_override?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          hidden_experience_ids?: string[]
          hidden_skill_ids?: string[]
          id?: string
          name?: string
          summary_override?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_config: {
        Row: {
          created_at: string
          description: string
          email: string
          id: string
          location: string
          name: string
          nav_links: Json
          social_links: Json
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          email: string
          id?: string
          location: string
          name: string
          nav_links?: Json
          social_links?: Json
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          email?: string
          id?: string
          location?: string
          name?: string
          nav_links?: Json
          social_links?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          category: string
          created_at: string
          icon: string | null
          id: string
          name: string
          proficiency: number
          sort_order: number
          updated_at: string
          years: number
        }
        Insert: {
          category: string
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          proficiency?: number
          sort_order?: number
          updated_at?: string
          years?: number
        }
        Update: {
          category?: string
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          proficiency?: number
          sort_order?: number
          updated_at?: string
          years?: number
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          author_name: string
          author_title: string
          avatar_url: string | null
          company: string
          created_at: string
          id: string
          quote: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          author_name: string
          author_title: string
          avatar_url?: string | null
          company: string
          created_at?: string
          id?: string
          quote: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          author_name?: string
          author_title?: string
          avatar_url?: string | null
          company?: string
          created_at?: string
          id?: string
          quote?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
