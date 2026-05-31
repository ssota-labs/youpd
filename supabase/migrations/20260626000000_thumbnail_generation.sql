-- S6: Slot-based thumbnail generation (drafts, jobs, generated assets).

create table if not exists public.thumbnail_generation_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  template_id uuid not null references public.creative_templates (id) on delete cascade,
  template_version text not null,
  slot_values_json jsonb not null,
  selected_reference_video_ids jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists thumbnail_generation_drafts_user_template_uidx
  on public.thumbnail_generation_drafts (user_id, template_id);

create index if not exists thumbnail_generation_drafts_user_updated_idx
  on public.thumbnail_generation_drafts (user_id, updated_at desc);

alter table public.thumbnail_generation_drafts enable row level security;
drop policy if exists "deny_all" on public.thumbnail_generation_drafts;
create policy "deny_all"
  on public.thumbnail_generation_drafts
  for all
  using (false)
  with check (false);

create table if not exists public.thumbnail_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  template_id uuid not null references public.creative_templates (id) on delete cascade,
  draft_id uuid references public.thumbnail_generation_drafts (id) on delete set null,
  status text not null,
  provider_key text not null,
  prompt_text text not null,
  prompt_version text not null,
  slot_values_json jsonb not null,
  reference_context_json jsonb,
  error_code text,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists thumbnail_generation_jobs_user_created_idx
  on public.thumbnail_generation_jobs (user_id, created_at desc);

alter table public.thumbnail_generation_jobs enable row level security;
drop policy if exists "deny_all" on public.thumbnail_generation_jobs;
create policy "deny_all"
  on public.thumbnail_generation_jobs
  for all
  using (false)
  with check (false);

create table if not exists public.generated_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  job_id uuid not null references public.thumbnail_generation_jobs (id) on delete cascade,
  template_id uuid not null references public.creative_templates (id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  mime_type text not null default 'image/png',
  width integer,
  height integer,
  lineage_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists generated_assets_job_idx
  on public.generated_assets (job_id);

alter table public.generated_assets enable row level security;
drop policy if exists "deny_all" on public.generated_assets;
create policy "deny_all"
  on public.generated_assets
  for all
  using (false)
  with check (false);
