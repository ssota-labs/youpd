-- YouTube API key pool + per-key daily quota rollup.
-- Both tables are deny-by-default (RLS on, no permissive policies). Only the
-- service-role client accesses them. Keys are seeded from the legacy
-- YOUTUBE_API_KEY env var by packages/api/src/mcp/youtube-key-pool on first
-- use; operators rotate by calling `pnpm api:youtube-key:add`.

create table if not exists public.youtube_api_keys (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  key text not null,
  status text not null default 'active',
  disabled_reason text,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint youtube_api_keys_status_check
    check (status in ('active','disabled','exhausted'))
);

create index if not exists youtube_api_keys_status_idx
  on public.youtube_api_keys (status);

alter table public.youtube_api_keys enable row level security;
drop policy if exists "deny_all" on public.youtube_api_keys;
create policy "deny_all"
  on public.youtube_api_keys
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.youtube_api_key_daily_usage (
  key_id uuid not null references public.youtube_api_keys(id) on delete cascade,
  usage_day date not null,
  units_consumed integer not null default 0,
  status text not null default 'ok',
  updated_at timestamptz not null default now(),
  primary key (key_id, usage_day),
  constraint youtube_api_key_daily_usage_status_check
    check (status in ('ok','quota_exceeded'))
);

alter table public.youtube_api_key_daily_usage enable row level security;
drop policy if exists "deny_all" on public.youtube_api_key_daily_usage;
create policy "deny_all"
  on public.youtube_api_key_daily_usage
  for all
  to anon, authenticated
  using (false)
  with check (false);
