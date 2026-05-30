-- S3: home user profiles + keyword probe generation persistence.
-- RLS deny-all; server uses service role.

create table if not exists public.home_user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  interest_topics text not null,
  channel_description text not null,
  own_channel_url text,
  reference_channel_urls jsonb not null default '[]'::jsonb,
  excluded_topics jsonb not null default '[]'::jsonb,
  preferred_region_code text not null default 'KR',
  updated_at timestamptz not null default now()
);

alter table public.home_user_profiles enable row level security;
drop policy if exists "deny_all" on public.home_user_profiles;
create policy "deny_all"
  on public.home_user_profiles
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.keyword_idea_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_snapshot jsonb not null,
  provider text not null,
  status text not null default 'completed',
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists keyword_idea_runs_user_created_idx
  on public.keyword_idea_runs (user_id, created_at desc);

alter table public.keyword_idea_runs enable row level security;
drop policy if exists "deny_all" on public.keyword_idea_runs;
create policy "deny_all"
  on public.keyword_idea_runs
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.user_keyword_probes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  generation_run_id uuid references public.keyword_idea_runs (id) on delete set null,
  probe_label text not null,
  audience text not null,
  seed_theme text not null,
  problem_or_situation text not null,
  goal text not null,
  consumer_stage text not null,
  rationale text not null,
  suggested_keywords jsonb not null default '[]'::jsonb,
  status text not null default 'draft',
  confidence text,
  linked_harvest_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_keyword_probes_user_status_idx
  on public.user_keyword_probes (user_id, status);

alter table public.user_keyword_probes enable row level security;
drop policy if exists "deny_all" on public.user_keyword_probes;
create policy "deny_all"
  on public.user_keyword_probes
  for all
  to anon, authenticated
  using (false)
  with check (false);
