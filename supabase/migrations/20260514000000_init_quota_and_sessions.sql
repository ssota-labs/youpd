-- YouTube Data API quota gate + per-call audit log.
-- Both tables are deny-by-default (RLS on, no policies). The MCP app accesses
-- them via the service-role client; no end-user surface reaches these rows.

create table if not exists public.daily_quota_usage (
  usage_day date primary key,
  units_consumed integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.daily_quota_usage enable row level security;
drop policy if exists "deny_all" on public.daily_quota_usage;
create policy "deny_all"
  on public.daily_quota_usage
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.search_sessions (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  operation text not null,
  keyword text,
  video_ids text[],
  channel_id text,
  result_count integer not null default 0,
  units_consumed integer not null default 0,
  status text not null,
  error_reason text,
  constraint search_sessions_status_check
    check (status in ('success','error','quota_exceeded'))
);

create index if not exists search_sessions_occurred_at_idx
  on public.search_sessions (occurred_at);
create index if not exists search_sessions_operation_idx
  on public.search_sessions (operation);

alter table public.search_sessions enable row level security;
drop policy if exists "deny_all" on public.search_sessions;
create policy "deny_all"
  on public.search_sessions
  for all
  to anon, authenticated
  using (false)
  with check (false);
