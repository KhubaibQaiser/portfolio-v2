-- =============================================================================
-- Initial Schema Migration
-- Portfolio V2 — Supabase
-- =============================================================================

-- pgvector — required before any vector(…) columns (Supabase: extensions schema)
create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- Helper: auto-update updated_at on row modification
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- 1. hero (singleton)
-- ---------------------------------------------------------------------------
create table public.hero (
  id          uuid primary key default gen_random_uuid(),
  greeting    text not null default 'Hi, my name is',
  name        text not null,
  headline    text not null,
  subtitle    text[] not null default '{}',
  value_proposition text not null,
  cta_primary_text  text not null default 'View My Work',
  cta_secondary_text text not null default 'Download Resume',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger hero_updated_at
  before update on public.hero
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. about (singleton)
-- ---------------------------------------------------------------------------
create table public.about (
  id               uuid primary key default gen_random_uuid(),
  bio              text not null,
  photo_url        text not null default '',
  status           text not null default 'available'
                     check (status in ('available', 'unavailable', 'open')),
  timezone         text not null default 'GMT+5',
  years_experience integer not null default 0,
  companies_count  integer not null default 0,
  countries_count  integer not null default 0,
  projects_count   integer not null default 0,
  users_impacted   text not null default '0',
  industries       text[] not null default '{}',
  languages        text[] not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger about_updated_at
  before update on public.about
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. experience
-- ---------------------------------------------------------------------------
create table public.experience (
  id            uuid primary key default gen_random_uuid(),
  company       text not null,
  role          text not null,
  location      text not null,
  location_type text not null default 'remote'
                  check (location_type in ('remote', 'onsite', 'hybrid')),
  start_date    text not null,
  end_date      text,
  description   text not null,
  tech_tags     text[] not null default '{}',
  logo_url      text,
  company_url   text,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index experience_sort_idx on public.experience (sort_order);

create trigger experience_updated_at
  before update on public.experience
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. projects
-- ---------------------------------------------------------------------------
create table public.projects (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  slug           text not null unique,
  description    text not null,
  summary        text not null,
  cover_url      text,
  tech_tags      text[] not null default '{}',
  role           text not null,
  type           text not null default 'web'
                   check (type in ('web', 'mobile', 'game', 'open-source', 'other')),
  github_url     text,
  live_url       text,
  playstore_url  text,
  appstore_url   text,
  is_featured    boolean not null default false,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index projects_sort_idx on public.projects (sort_order);
create index projects_featured_idx on public.projects (is_featured) where is_featured = true;

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. skills
-- ---------------------------------------------------------------------------
create table public.skills (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null,
  proficiency integer not null default 50
                check (proficiency >= 0 and proficiency <= 100),
  icon        text,
  years       integer not null default 0,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index skills_category_sort_idx on public.skills (category, sort_order);

create trigger skills_updated_at
  before update on public.skills
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. resume (singleton)
-- ---------------------------------------------------------------------------
create table public.resume (
  id                  uuid primary key default gen_random_uuid(),
  default_summary     text not null,
  education           jsonb not null default '[]',
  certifications      jsonb not null default '[]',
  visible_sections    jsonb not null default '[]',
  is_projects_visible boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger resume_updated_at
  before update on public.resume
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. resume_variants
-- ---------------------------------------------------------------------------
create table public.resume_variants (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  summary_override      text,
  hidden_experience_ids text[] not null default '{}',
  hidden_skill_ids      text[] not null default '{}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger resume_variants_updated_at
  before update on public.resume_variants
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. testimonials
-- ---------------------------------------------------------------------------
create table public.testimonials (
  id           uuid primary key default gen_random_uuid(),
  quote        text not null,
  author_name  text not null,
  author_title text not null,
  company      text not null,
  avatar_url   text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index testimonials_sort_idx on public.testimonials (sort_order);

create trigger testimonials_updated_at
  before update on public.testimonials
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 9. site_config (singleton)
-- ---------------------------------------------------------------------------
create table public.site_config (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null,
  location     text not null,
  title        text not null,
  description  text not null,
  social_links jsonb not null default '[]',
  nav_links    jsonb not null default '[]',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger site_config_updated_at
  before update on public.site_config
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 10. media
-- ---------------------------------------------------------------------------
create table public.media (
  id          uuid primary key default gen_random_uuid(),
  filename    text not null,
  url         text not null,
  alt_text    text,
  size        integer not null default 0,
  mime_type   text not null,
  uploaded_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 11. content_embeddings (future RAG)
-- ---------------------------------------------------------------------------
create table public.content_embeddings (
  id           uuid primary key default gen_random_uuid(),
  chunk_text   text not null,
  embedding    extensions.vector(1536),
  source_table text not null,
  source_id    uuid not null,
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

create index content_embeddings_source_idx
  on public.content_embeddings (source_table, source_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

-- Enable RLS on all tables
alter table public.hero enable row level security;
alter table public.about enable row level security;
alter table public.experience enable row level security;
alter table public.projects enable row level security;
alter table public.skills enable row level security;
alter table public.resume enable row level security;
alter table public.resume_variants enable row level security;
alter table public.testimonials enable row level security;
alter table public.site_config enable row level security;
alter table public.media enable row level security;
alter table public.content_embeddings enable row level security;

-- Public read for portfolio content
create policy "Public read hero"         on public.hero         for select using (true);
create policy "Public read about"        on public.about        for select using (true);
create policy "Public read experience"   on public.experience   for select using (true);
create policy "Public read projects"     on public.projects     for select using (true);
create policy "Public read skills"       on public.skills       for select using (true);
create policy "Public read resume"       on public.resume       for select using (true);
create policy "Public read resume_variants" on public.resume_variants for select using (true);
create policy "Public read testimonials" on public.testimonials for select using (true);
create policy "Public read site_config"  on public.site_config  for select using (true);

-- Authenticated write for admin
create policy "Admin write hero"         on public.hero         for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Admin write about"        on public.about        for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Admin write experience"   on public.experience   for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Admin write projects"     on public.projects     for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Admin write skills"       on public.skills       for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Admin write resume"       on public.resume       for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Admin write resume_variants" on public.resume_variants for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Admin write testimonials" on public.testimonials for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Admin write site_config"  on public.site_config  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Admin write media"        on public.media        for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Admin write embeddings"   on public.content_embeddings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
