-- S9: social post ingestion as reference evidence.

create table if not exists public.social_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  connection_status text not null,
  config_json jsonb,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists social_sources_user_idx
  on public.social_sources (user_id);

alter table public.social_sources enable row level security;
drop policy if exists "deny_all" on public.social_sources;
create policy "deny_all"
  on public.social_sources
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  external_id text,
  permalink text not null,
  permalink_hash text not null,
  author_handle text not null,
  author_display_name text,
  text_content text not null,
  published_at timestamptz,
  ingest_mode text not null,
  fetch_status text not null,
  raw_payload_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, permalink_hash)
);

create index if not exists social_posts_user_updated_idx
  on public.social_posts (user_id, updated_at desc);

alter table public.social_posts enable row level security;
drop policy if exists "deny_all" on public.social_posts;
create policy "deny_all"
  on public.social_posts
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.social_post_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts (id) on delete cascade,
  captured_at timestamptz not null default now(),
  metrics_json jsonb not null,
  source text not null
);

create index if not exists social_post_metric_snapshots_post_idx
  on public.social_post_metric_snapshots (post_id, captured_at desc);

alter table public.social_post_metric_snapshots enable row level security;
drop policy if exists "deny_all" on public.social_post_metric_snapshots;
create policy "deny_all"
  on public.social_post_metric_snapshots
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.social_post_scores (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts (id) on delete cascade,
  snapshot_id uuid not null references public.social_post_metric_snapshots (id) on delete cascade,
  policy_version text not null,
  performance_grade text not null,
  engagement_grade text not null,
  recency_grade text not null,
  rank_score numeric,
  score_breakdown_json jsonb not null,
  computed_at timestamptz not null default now()
);

create index if not exists social_post_scores_post_idx
  on public.social_post_scores (post_id, computed_at desc);

alter table public.social_post_scores enable row level security;
drop policy if exists "deny_all" on public.social_post_scores;
create policy "deny_all"
  on public.social_post_scores
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.reference_folder_social_posts (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.reference_folders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  social_post_id uuid not null references public.social_posts (id) on delete cascade,
  lineage jsonb not null,
  save_reason text,
  created_at timestamptz not null default now(),
  unique (folder_id, social_post_id)
);

alter table public.reference_folder_social_posts enable row level security;
drop policy if exists "deny_all" on public.reference_folder_social_posts;
create policy "deny_all"
  on public.reference_folder_social_posts
  for all
  to anon, authenticated
  using (false)
  with check (false);
