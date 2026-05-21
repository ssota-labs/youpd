-- Reconcile preview branches that already applied the older feature-branch
-- youtube_api_keys migration before main introduced the canonical key pool.

create table if not exists public.youtube_api_keys (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  key text not null,
  status text not null default 'active',
  disabled_reason text,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.youtube_api_keys
  drop constraint if exists youtube_api_keys_status_check;

alter table if exists public.youtube_api_keys
  add column if not exists label text,
  add column if not exists key text,
  add column if not exists disabled_reason text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'youtube_api_keys'
      and column_name = 'name'
  ) then
    execute $sql$
      update public.youtube_api_keys
      set label = coalesce(label, name),
          updated_at = now()
      where label is null
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'youtube_api_keys'
      and column_name = 'key_value'
  ) then
    execute $sql$
      update public.youtube_api_keys
      set key = coalesce(key, key_value),
          updated_at = now()
      where key is null
    $sql$;
  end if;
end $$;

update public.youtube_api_keys
set
  status = case
    when status = 'quota_exhausted' then 'exhausted'
    else status
  end,
  disabled_reason = coalesce(
    disabled_reason,
    case when status = 'quota_exhausted' then 'quotaExceeded' else null end
  ),
  updated_at = now()
where status = 'quota_exhausted';

alter table if exists public.youtube_api_keys
  alter column label set not null,
  alter column key set not null;

alter table if exists public.youtube_api_keys
  drop column if exists name,
  drop column if exists key_hash,
  drop column if exists key_value,
  drop column if exists quota_exhausted_at,
  drop column if exists failure_count;

alter table if exists public.youtube_api_keys
  add constraint youtube_api_keys_status_check
    check (status in ('active','disabled','exhausted'));

create unique index if not exists youtube_api_keys_label_key
  on public.youtube_api_keys (label);

create index if not exists youtube_api_keys_status_idx
  on public.youtube_api_keys (status);

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

alter table public.youtube_api_keys enable row level security;
drop policy if exists "deny_all" on public.youtube_api_keys;
create policy "deny_all"
  on public.youtube_api_keys
  for all
  to anon, authenticated
  using (false)
  with check (false);

alter table public.youtube_api_key_daily_usage enable row level security;
drop policy if exists "deny_all" on public.youtube_api_key_daily_usage;
create policy "deny_all"
  on public.youtube_api_key_daily_usage
  for all
  to anon, authenticated
  using (false)
  with check (false);
