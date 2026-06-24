import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Entity } from "electrodb";
import { ulid } from "ulid";

/**
 * Single-table ElectroDB model. Every entity lives in one physical table and is
 * partitioned by its type (`pk`), keyed by id (`sk`). Singletons use static
 * keys; projects expose a `bySlug` access pattern on the `gsi1` index.
 *
 * Timestamps are managed by ElectroDB: `created_at` is set once, `updated_at`
 * is refreshed on every write via `watch`.
 */
const SERVICE = "portfolio";

type Config = { client: DynamoDBDocumentClient; table: string };

const createdAt = {
  type: "string",
  readOnly: true,
  required: true,
  default: () => new Date().toISOString(),
} as const;

const updatedAt = {
  type: "string",
  required: true,
  watch: "*",
  default: () => new Date().toISOString(),
  set: () => new Date().toISOString(),
} as const;

const id = {
  type: "string",
  required: true,
  default: () => ulid(),
} as const;

/** A singleton index: one item per entity type, static partition + sort key. */
const singletonIndex = {
  primary: {
    pk: { field: "pk", composite: [] },
    sk: { field: "sk", composite: [] },
  },
} as const;

/** A collection index: all items of a type share a partition, keyed by id. */
const collectionIndex = {
  primary: {
    pk: { field: "pk", composite: [] },
    sk: { field: "sk", composite: ["id"] },
  },
} as const;

export function createEntities({ client, table }: Config) {
  const opts = { client, table };

  const hero = new Entity(
    {
      model: { entity: "hero", version: "1", service: SERVICE },
      attributes: {
        greeting: { type: "string", required: true },
        name: { type: "string", required: true },
        headline: { type: "string", required: true },
        subtitle: { type: "list", items: { type: "string" }, required: true },
        value_proposition: { type: "string", required: true },
        cta_primary_text: { type: "string", required: true },
        cta_secondary_text: { type: "string", required: true },
        created_at: createdAt,
        updated_at: updatedAt,
      },
      indexes: singletonIndex,
    },
    opts,
  );

  const about = new Entity(
    {
      model: { entity: "about", version: "1", service: SERVICE },
      attributes: {
        bio: { type: "string", required: true },
        photo_url: { type: "string", required: true },
        status: {
          type: ["available", "unavailable", "open"] as const,
          required: true,
        },
        timezone: { type: "string", required: true },
        years_experience: { type: "number", required: true },
        companies_count: { type: "number", required: true },
        countries_count: { type: "number", required: true },
        projects_count: { type: "number", required: true },
        users_impacted: { type: "string", required: true },
        industries: { type: "list", items: { type: "string" }, required: true },
        languages: { type: "list", items: { type: "string" }, required: true },
        created_at: createdAt,
        updated_at: updatedAt,
      },
      indexes: singletonIndex,
    },
    opts,
  );

  const siteConfig = new Entity(
    {
      model: { entity: "siteConfig", version: "1", service: SERVICE },
      attributes: {
        name: { type: "string", required: true },
        email: { type: "string", required: true },
        location: { type: "string", required: true },
        title: { type: "string", required: true },
        description: { type: "string", required: true },
        social_links: {
          type: "list",
          required: true,
          items: {
            type: "map",
            properties: {
              platform: { type: "string", required: true },
              url: { type: "string", required: true },
              label: { type: "string", required: true },
            },
          },
        },
        nav_links: {
          type: "list",
          required: true,
          items: {
            type: "map",
            properties: {
              label: { type: "string", required: true },
              href: { type: "string", required: true },
            },
          },
        },
        created_at: createdAt,
        updated_at: updatedAt,
      },
      indexes: singletonIndex,
    },
    opts,
  );

  const resume = new Entity(
    {
      model: { entity: "resume", version: "1", service: SERVICE },
      attributes: {
        default_summary: { type: "string", required: true },
        education: {
          type: "list",
          required: true,
          items: {
            type: "map",
            properties: {
              degree: { type: "string", required: true },
              institution: { type: "string", required: true },
              year: { type: "string", required: true },
              url: { type: "string" },
            },
          },
        },
        certifications: {
          type: "list",
          required: true,
          items: {
            type: "map",
            properties: {
              name: { type: "string", required: true },
              issuer: { type: "string", required: true },
              url: { type: "string" },
            },
          },
        },
        visible_sections: {
          type: "list",
          items: { type: "string" },
          required: true,
        },
        is_projects_visible: { type: "boolean", required: true },
        voice_sample: { type: "string" },
        created_at: createdAt,
        updated_at: updatedAt,
      },
      indexes: singletonIndex,
    },
    opts,
  );

  const experience = new Entity(
    {
      model: { entity: "experience", version: "1", service: SERVICE },
      attributes: {
        id,
        company: { type: "string", required: true },
        role: { type: "string", required: true },
        location: { type: "string", required: true },
        location_type: {
          type: ["remote", "onsite", "hybrid"] as const,
          required: true,
        },
        contract_type: {
          type: [
            "full_time",
            "part_time",
            "contract",
            "freelance",
            "internship",
          ] as const,
          required: true,
        },
        start_date: { type: "string", required: true },
        end_date: { type: "string" },
        description: { type: "string", required: true },
        tech_tags: { type: "list", items: { type: "string" }, required: true },
        logo_url: { type: "string" },
        company_url: { type: "string" },
        sort_order: { type: "number", required: true },
        created_at: createdAt,
        updated_at: updatedAt,
      },
      indexes: collectionIndex,
    },
    opts,
  );

  const project = new Entity(
    {
      model: { entity: "project", version: "1", service: SERVICE },
      attributes: {
        id,
        title: { type: "string", required: true },
        slug: { type: "string", required: true },
        description: { type: "string", required: true },
        summary: { type: "string", required: true },
        cover_url: { type: "string" },
        tech_tags: { type: "list", items: { type: "string" }, required: true },
        role: { type: "string", required: true },
        type: {
          type: ["web", "mobile", "game", "open-source", "other"] as const,
          required: true,
        },
        github_url: { type: "string" },
        live_url: { type: "string" },
        playstore_url: { type: "string" },
        appstore_url: { type: "string" },
        is_featured: { type: "boolean", required: true },
        sort_order: { type: "number", required: true },
        created_at: createdAt,
        updated_at: updatedAt,
      },
      indexes: {
        primary: {
          pk: { field: "pk", composite: [] },
          sk: { field: "sk", composite: ["id"] },
        },
        bySlug: {
          index: "gsi1",
          pk: { field: "gsi1pk", composite: ["slug"] },
          sk: { field: "gsi1sk", composite: [] },
        },
      },
    },
    opts,
  );

  const skill = new Entity(
    {
      model: { entity: "skill", version: "1", service: SERVICE },
      attributes: {
        id,
        name: { type: "string", required: true },
        category: {
          type: [
            "frontend",
            "mobile",
            "backend",
            "cloud",
            "devops",
            "testing",
            "tools",
            "build",
            "state",
            "cms",
            "legacy",
          ] as const,
          required: true,
        },
        proficiency: { type: "number", required: true },
        icon: { type: "string" },
        years: { type: "number", required: true },
        sort_order: { type: "number", required: true },
        created_at: createdAt,
        updated_at: updatedAt,
      },
      indexes: collectionIndex,
    },
    opts,
  );

  const testimonial = new Entity(
    {
      model: { entity: "testimonial", version: "1", service: SERVICE },
      attributes: {
        id,
        quote: { type: "string", required: true },
        author_name: { type: "string", required: true },
        author_title: { type: "string", required: true },
        company: { type: "string", required: true },
        avatar_url: { type: "string" },
        sort_order: { type: "number", required: true },
        created_at: createdAt,
        updated_at: updatedAt,
      },
      indexes: collectionIndex,
    },
    opts,
  );

  const resumeVariant = new Entity(
    {
      model: { entity: "resumeVariant", version: "1", service: SERVICE },
      attributes: {
        id,
        name: { type: "string", required: true },
        summary_override: { type: "string" },
        hidden_experience_ids: {
          type: "list",
          items: { type: "string" },
          required: true,
        },
        hidden_skill_ids: {
          type: "list",
          items: { type: "string" },
          required: true,
        },
        created_at: createdAt,
        updated_at: updatedAt,
      },
      indexes: collectionIndex,
    },
    opts,
  );

  const media = new Entity(
    {
      model: { entity: "media", version: "1", service: SERVICE },
      attributes: {
        id,
        filename: { type: "string", required: true },
        url: { type: "string", required: true },
        mime_type: { type: "string", required: true },
        size: { type: "number", required: true },
        alt_text: { type: "string" },
        uploaded_at: {
          type: "string",
          readOnly: true,
          required: true,
          default: () => new Date().toISOString(),
        },
      },
      indexes: collectionIndex,
    },
    opts,
  );

  const resumeGeneration = new Entity(
    {
      model: { entity: "resumeGeneration", version: "1", service: SERVICE },
      attributes: {
        id,
        created_by: { type: "string", required: true },
        company: { type: "string" },
        role: { type: "string" },
        hiring_manager: { type: "string" },
        language: { type: ["en", "de", "fr"] as const, required: true },
        tone: { type: ["formal", "friendly", "enthusiastic"] as const },
        length: { type: ["short", "standard", "detailed"] as const },
        jd_text: { type: "string", required: true },
        jd_source: { type: ["paste", "pdf"] as const, required: true },
        jd_pdf_url: { type: "string" },
        model: { type: "string", required: true },
        fallback_used: { type: "boolean", required: true },
        resume: { type: "any" },
        cover_letter: { type: "any" },
        ats: { type: "any" },
        usage: { type: "any" },
        resume_pdf_url: { type: "string" },
        cover_letter_pdf_url: { type: "string" },
        archived_at: { type: "string" },
        deleted_at: { type: "string" },
        created_at: createdAt,
        updated_at: updatedAt,
      },
      indexes: collectionIndex,
    },
    opts,
  );

  return {
    hero,
    about,
    siteConfig,
    resume,
    experience,
    project,
    skill,
    testimonial,
    resumeVariant,
    media,
    resumeGeneration,
  };
}

export type PortfolioEntities = ReturnType<typeof createEntities>;
