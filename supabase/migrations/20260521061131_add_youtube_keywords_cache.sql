create table if not exists public.youtube_keywords (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  normalized_keyword text not null,
  region_code text not null default 'KR',
  search_order text not null default 'relevance',
  last_harvest_id uuid references public.youtube_harvest_sessions(id) on delete set null,
  last_collected_at timestamptz,
  cache_expires_at timestamptz,
  result_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists youtube_keywords_norm_region_order_uidx
  on public.youtube_keywords (normalized_keyword, region_code, search_order);

create index if not exists youtube_keywords_cache_expires_idx
  on public.youtube_keywords (cache_expires_at);

create index if not exists youtube_keywords_last_collected_idx
  on public.youtube_keywords (last_collected_at desc);

alter table public.youtube_keywords enable row level security;

drop policy if exists "deny_all" on public.youtube_keywords;
create policy "deny_all" on public.youtube_keywords
  for all to anon, authenticated using (false) with check (false);
