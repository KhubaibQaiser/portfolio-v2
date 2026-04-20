-- =============================================================================
-- Resume AI: generations history + voice sample
-- =============================================================================

-- ---------------------------------------------------------------------------
-- resume: voice sample for the anti-robotic few-shot voice anchor
-- ---------------------------------------------------------------------------
alter table public.resume
  add column if not exists voice_sample text;

comment on column public.resume.voice_sample is
  'Admin-written sample (~150-300 words) used as a voice anchor in the AI resume generator to avoid robotic/AI-sounding output.';

-- ---------------------------------------------------------------------------
-- resume_generations: persisted outputs of the Resume AI generator
-- ---------------------------------------------------------------------------
create table public.resume_generations (
  id                     uuid primary key default gen_random_uuid(),
  created_by             uuid not null references auth.users(id) on delete cascade,

  -- JD + options
  company                text,
  role                   text,
  hiring_manager         text,
  language               text not null default 'en'
    check (language in ('en', 'de', 'fr')),
  tone                   text
    check (tone is null or tone in ('formal', 'friendly', 'enthusiastic')),
  length                 text
    check (length is null or length in ('short', 'standard', 'detailed')),
  jd_text                text not null,
  jd_source              text not null
    check (jd_source in ('paste', 'pdf')),
  jd_pdf_url             text,

  -- Model + output
  model                  text not null,
  fallback_used          boolean not null default false,
  resume                 jsonb,
  cover_letter           jsonb,
  ats                    jsonb,

  -- Telemetry
  usage                  jsonb,

  -- Future PDF archival (Option C). Nullable so v1 doesn't persist PDFs.
  resume_pdf_url         text,
  cover_letter_pdf_url   text,
  archived_at            timestamptz,

  -- Soft-delete for audit / undo
  deleted_at             timestamptz,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.resume_generations is
  'Each row captures one admin-triggered Resume AI generation — JD input, tailored resume, cover letter, ATS score, and cost telemetry.';
comment on column public.resume_generations.usage is
  'Telemetry JSON: { inputTokens, outputTokens, totalTokens, costUsd, latencyMs, fallbackUsed, model }';
comment on column public.resume_generations.archived_at is
  'Set when the admin chooses to archive the final PDF to R2 (Option C). Null = render on demand.';

create trigger resume_generations_updated_at
  before update on public.resume_generations
  for each row execute function public.set_updated_at();

-- Indexes
create index resume_generations_user_created_idx
  on public.resume_generations (created_by, created_at desc);

create index resume_generations_archived_idx
  on public.resume_generations (created_by, archived_at desc)
  where archived_at is not null;

create index resume_generations_jd_tsv_idx
  on public.resume_generations
  using gin (to_tsvector('english', coalesce(jd_text, '')));

-- date_trunc(timestamptz) is STABLE (session TZ); UTC wall time makes this IMMUTABLE (42P17).
create index resume_generations_cost_day_idx
  on public.resume_generations (
    created_by,
    (date_trunc('day', created_at at time zone 'UTC'))
  );

-- Row Level Security
alter table public.resume_generations enable row level security;

create policy "admin rw own generations"
  on public.resume_generations
  for all
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);
