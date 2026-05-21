-- Canonical YouTube entities (videos, channels) + per-keyword search harvest
-- sessions used by the Notion Worker harvestKeywordIdea / publishHarvestToNotion
-- tool pair. Notion writes happen out-of-band; this is the staging layer that
-- lets a Notion Worker tool finish under the 60s capability ceiling by reading
-- already-fetched videos in chunks instead of re-paginating YouTube.
--
-- All tables are RLS-enabled with a deny-all policy. The MCP / REST app uses
-- the service-role client, which bypasses RLS; no anon/authenticated traffic
-- should ever reach these rows.

create table if not exists public.channels (
  channel_id text primary key,
  title text,
  subscriber_count bigint,
  view_count bigint,
  video_count integer,
  published_at timestamptz,
  url text,
  notion_page_id text,
  notion_synced_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists channels_notion_synced_idx
  on public.channels (notion_synced_at);

alter table public.channels enable row level security;
drop policy if exists "deny_all" on public.channels;
create policy "deny_all"
  on public.channels
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.videos (
  video_id text primary key,
  channel_id text not null references public.channels(channel_id) on delete restrict,
  title text,
  views bigint,
  likes bigint,
  comments bigint,
  duration_sec integer,
  published_at timestamptz,
  url text,
  notion_page_id text,
  notion_synced_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists videos_channel_id_idx
  on public.videos (channel_id);
create index if not exists videos_notion_synced_idx
  on public.videos (notion_synced_at);

alter table public.videos enable row level security;
drop policy if exists "deny_all" on public.videos;
create policy "deny_all"
  on public.videos
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.search_harvests (
  id uuid primary key default gen_random_uuid(),
  keyword_idea_page_id text not null,
  keyword text not null,
  search_session_id uuid references public.search_sessions(id),
  status text not null,
  total_videos integer not null default 0,
  total_channels integer not null default 0,
  notion_keyword_page_id text,
  finalized boolean not null default false,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint search_harvests_status_check
    check (status in ('fetched','publishing','published','failed'))
);

create index if not exists search_harvests_keyword_idea_idx
  on public.search_harvests (keyword_idea_page_id, created_at);
create index if not exists search_harvests_status_idx
  on public.search_harvests (status);

alter table public.search_harvests enable row level security;
drop policy if exists "deny_all" on public.search_harvests;
create policy "deny_all"
  on public.search_harvests
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.search_harvest_videos (
  harvest_id uuid not null references public.search_harvests(id) on delete cascade,
  video_id text not null references public.videos(video_id) on delete restrict,
  position integer not null,
  notion_relation_synced boolean not null default false,
  primary key (harvest_id, video_id)
);

create index if not exists search_harvest_videos_pending_idx
  on public.search_harvest_videos (harvest_id);

alter table public.search_harvest_videos enable row level security;
drop policy if exists "deny_all" on public.search_harvest_videos;
create policy "deny_all"
  on public.search_harvest_videos
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.search_harvest_channels (
  harvest_id uuid not null references public.search_harvests(id) on delete cascade,
  channel_id text not null references public.channels(channel_id) on delete restrict,
  notion_relation_synced boolean not null default false,
  primary key (harvest_id, channel_id)
);

create index if not exists search_harvest_channels_pending_idx
  on public.search_harvest_channels (harvest_id);

alter table public.search_harvest_channels enable row level security;
drop policy if exists "deny_all" on public.search_harvest_channels;
create policy "deny_all"
  on public.search_harvest_channels
  for all
  to anon, authenticated
  using (false)
  with check (false);
