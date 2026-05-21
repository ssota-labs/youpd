create table if not exists public.youtube_api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  key_hash text not null unique,
  key_value text not null,
  status text not null default 'active',
  last_used_at timestamptz,
  quota_exhausted_at timestamptz,
  failure_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint youtube_api_keys_status_check
    check (status in ('active', 'quota_exhausted', 'disabled'))
);

create index if not exists youtube_api_keys_status_last_used_idx
  on public.youtube_api_keys (status, last_used_at asc);

alter table public.youtube_api_keys enable row level security;

drop policy if exists "deny_all" on public.youtube_api_keys;
create policy "deny_all" on public.youtube_api_keys
  for all to anon, authenticated using (false) with check (false);
