-- YouTube canonical storage for v0.12 Data API & MCP Foundation.
-- Tables are server-owned: RLS is enabled and anon/authenticated get deny-all
-- policies. REST/MCP code reads and writes through privileged server adapters.

create table if not exists public.youtube_channels (
  channel_id text primary key,
  title text not null,
  description text,
  thumbnail_url text,
  published_at timestamptz,
  subscriber_count bigint,
  video_count bigint,
  view_count bigint,
  hidden_subscriber_count boolean not null default false,
  average_view_count bigint,
  average_view_count_basis jsonb,
  uploads_playlist_id text,
  country text,
  url text,
  raw jsonb,
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists youtube_channels_collected_at_idx
  on public.youtube_channels (collected_at);

create table if not exists public.youtube_videos (
  video_id text primary key,
  channel_id text references public.youtube_channels(channel_id) on delete set null,
  title text not null,
  description text,
  thumbnail_url text,
  video_url text,
  published_at timestamptz,
  duration_sec integer,
  view_count bigint,
  like_count bigint,
  comment_count bigint,
  category_id text,
  tags jsonb,
  default_audio_language text,
  raw jsonb,
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists youtube_videos_channel_published_idx
  on public.youtube_videos (channel_id, published_at desc);
create index if not exists youtube_videos_published_at_idx
  on public.youtube_videos (published_at desc);

create table if not exists public.youtube_comments (
  comment_id text primary key,
  video_id text not null references public.youtube_videos(video_id) on delete cascade,
  author_display_name text not null,
  text text not null,
  like_count bigint not null default 0,
  total_reply_count integer not null default 0,
  published_at timestamptz,
  comment_updated_at timestamptz,
  parent_comment_id text,
  raw jsonb,
  collected_at timestamptz not null default now()
);

create index if not exists youtube_comments_video_likes_idx
  on public.youtube_comments (video_id, like_count desc);
create index if not exists youtube_comments_video_published_idx
  on public.youtube_comments (video_id, published_at desc);

create table if not exists public.youtube_harvest_sessions (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  query jsonb not null,
  status text not null default 'running',
  result_count integer not null default 0,
  error jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint youtube_harvest_sessions_status_check
    check (status in ('pending','running','success','partial_success','failed'))
);

create index if not exists youtube_harvest_sessions_type_started_idx
  on public.youtube_harvest_sessions (type, started_at desc);

create table if not exists public.youtube_keyword_video_results (
  id uuid primary key default gen_random_uuid(),
  harvest_id uuid references public.youtube_harvest_sessions(id) on delete set null,
  keyword text not null,
  video_id text not null references public.youtube_videos(video_id) on delete cascade,
  rank integer not null,
  search_order text not null default 'relevance',
  region_code text not null default 'KR',
  published_after timestamptz,
  published_before timestamptz,
  collected_at timestamptz not null default now()
);

create unique index if not exists youtube_keyword_results_harvest_keyword_video_uidx
  on public.youtube_keyword_video_results (harvest_id, keyword, video_id);
create index if not exists youtube_keyword_results_keyword_collected_idx
  on public.youtube_keyword_video_results (keyword, collected_at desc);

create table if not exists public.youtube_hot_videos (
  id uuid primary key default gen_random_uuid(),
  hot_date date not null,
  region_code text not null default 'KR',
  category_id text,
  video_id text not null references public.youtube_videos(video_id) on delete cascade,
  rank integer not null,
  source text not null default 'youtube_trending',
  collected_at timestamptz not null default now()
);

create unique index if not exists youtube_hot_videos_snapshot_uidx
  on public.youtube_hot_videos (hot_date, region_code, coalesce(category_id, ''), video_id);
create index if not exists youtube_hot_videos_date_region_rank_idx
  on public.youtube_hot_videos (hot_date, region_code, category_id, rank);

create table if not exists public.youtube_video_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  video_id text not null references public.youtube_videos(video_id) on delete cascade,
  view_count bigint,
  like_count bigint,
  comment_count bigint,
  source text not null default 'video_detail',
  collected_at timestamptz not null default now()
);

create unique index if not exists youtube_video_snapshots_date_video_uidx
  on public.youtube_video_metric_snapshots (snapshot_date, video_id);
create index if not exists youtube_video_snapshots_video_date_idx
  on public.youtube_video_metric_snapshots (video_id, snapshot_date desc);

create table if not exists public.youtube_channel_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  channel_id text not null references public.youtube_channels(channel_id) on delete cascade,
  subscriber_count bigint,
  view_count bigint,
  video_count bigint,
  source text not null default 'channel_detail',
  collected_at timestamptz not null default now()
);

create unique index if not exists youtube_channel_snapshots_date_channel_uidx
  on public.youtube_channel_metric_snapshots (snapshot_date, channel_id);
create index if not exists youtube_channel_snapshots_channel_date_idx
  on public.youtube_channel_metric_snapshots (channel_id, snapshot_date desc);

alter table public.youtube_channels enable row level security;
alter table public.youtube_videos enable row level security;
alter table public.youtube_comments enable row level security;
alter table public.youtube_harvest_sessions enable row level security;
alter table public.youtube_keyword_video_results enable row level security;
alter table public.youtube_hot_videos enable row level security;
alter table public.youtube_video_metric_snapshots enable row level security;
alter table public.youtube_channel_metric_snapshots enable row level security;

drop policy if exists "deny_all" on public.youtube_channels;
create policy "deny_all" on public.youtube_channels
  for all to anon, authenticated using (false) with check (false);

drop policy if exists "deny_all" on public.youtube_videos;
create policy "deny_all" on public.youtube_videos
  for all to anon, authenticated using (false) with check (false);

drop policy if exists "deny_all" on public.youtube_comments;
create policy "deny_all" on public.youtube_comments
  for all to anon, authenticated using (false) with check (false);

drop policy if exists "deny_all" on public.youtube_harvest_sessions;
create policy "deny_all" on public.youtube_harvest_sessions
  for all to anon, authenticated using (false) with check (false);

drop policy if exists "deny_all" on public.youtube_keyword_video_results;
create policy "deny_all" on public.youtube_keyword_video_results
  for all to anon, authenticated using (false) with check (false);

drop policy if exists "deny_all" on public.youtube_hot_videos;
create policy "deny_all" on public.youtube_hot_videos
  for all to anon, authenticated using (false) with check (false);

drop policy if exists "deny_all" on public.youtube_video_metric_snapshots;
create policy "deny_all" on public.youtube_video_metric_snapshots
  for all to anon, authenticated using (false) with check (false);

drop policy if exists "deny_all" on public.youtube_channel_metric_snapshots;
create policy "deny_all" on public.youtube_channel_metric_snapshots
  for all to anon, authenticated using (false) with check (false);
