create table if not exists public.youtube_channels (
  channel_id text primary key,
  title text not null,
  description text not null default '',
  thumbnails jsonb not null default '{}'::jsonb,
  subscriber_count bigint,
  view_count bigint,
  video_count bigint,
  average_view_count bigint,
  hidden_subscriber_count boolean not null default false,
  uploads_playlist_id text,
  country text,
  url text not null,
  published_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.youtube_videos (
  video_id text primary key,
  channel_id text not null references public.youtube_channels(channel_id) on delete restrict,
  title text not null,
  description text not null default '',
  thumbnails jsonb not null default '{}'::jsonb,
  duration_sec integer,
  view_count bigint,
  like_count bigint,
  comment_count bigint,
  tags text[] not null default array[]::text[],
  category_id text,
  default_audio_language text,
  url text not null,
  published_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists youtube_videos_channel_id_idx on public.youtube_videos(channel_id);
create index if not exists youtube_videos_view_count_idx on public.youtube_videos(view_count);
create index if not exists youtube_videos_published_at_idx on public.youtube_videos(published_at);

create table if not exists public.youtube_comments (
  comment_id text primary key,
  video_id text not null references public.youtube_videos(video_id) on delete cascade,
  author_display_name text not null default '',
  author_channel_id text,
  body text not null,
  like_count integer not null default 0,
  total_reply_count integer not null default 0,
  published_at timestamptz,
  updated_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists youtube_comments_video_id_idx on public.youtube_comments(video_id);
create index if not exists youtube_comments_like_count_idx on public.youtube_comments(like_count);

create table if not exists public.hot_videos (
  id uuid primary key default gen_random_uuid(),
  hot_date date not null,
  video_id text not null references public.youtube_videos(video_id) on delete cascade,
  source text not null default 'chart=mostPopular',
  region_code text,
  category_id text,
  chart_rank integer,
  created_at timestamptz not null default now()
);

create unique index if not exists hot_videos_hot_date_video_id_source_unique
  on public.hot_videos(hot_date, video_id, source);
create index if not exists hot_videos_hot_date_idx on public.hot_videos(hot_date);
create index if not exists hot_videos_video_id_idx on public.hot_videos(video_id);

create table if not exists public.search_harvests (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  status text not null default 'fetched',
  quota_session_id uuid references public.search_sessions(id) on delete set null,
  total_videos integer not null default 0,
  total_channels integer not null default 0,
  created_at timestamptz not null default now(),
  constraint search_harvests_status_check check (status in ('fetched', 'failed'))
);

create index if not exists search_harvests_keyword_created_at_idx
  on public.search_harvests(keyword, created_at);

create table if not exists public.search_harvest_videos (
  harvest_id uuid not null references public.search_harvests(id) on delete cascade,
  video_id text not null references public.youtube_videos(video_id) on delete restrict,
  position integer not null,
  primary key (harvest_id, video_id)
);

create index if not exists search_harvest_videos_harvest_position_idx
  on public.search_harvest_videos(harvest_id, position);

create table if not exists public.search_harvest_channels (
  harvest_id uuid not null references public.search_harvests(id) on delete cascade,
  channel_id text not null references public.youtube_channels(channel_id) on delete restrict,
  primary key (harvest_id, channel_id)
);

alter table public.youtube_channels enable row level security;
alter table public.youtube_videos enable row level security;
alter table public.youtube_comments enable row level security;
alter table public.hot_videos enable row level security;
alter table public.search_harvests enable row level security;
alter table public.search_harvest_videos enable row level security;
alter table public.search_harvest_channels enable row level security;

create policy deny_all_youtube_channels on public.youtube_channels for all to anon, authenticated using (false) with check (false);
create policy deny_all_youtube_videos on public.youtube_videos for all to anon, authenticated using (false) with check (false);
create policy deny_all_youtube_comments on public.youtube_comments for all to anon, authenticated using (false) with check (false);
create policy deny_all_hot_videos on public.hot_videos for all to anon, authenticated using (false) with check (false);
create policy deny_all_search_harvests on public.search_harvests for all to anon, authenticated using (false) with check (false);
create policy deny_all_search_harvest_videos on public.search_harvest_videos for all to anon, authenticated using (false) with check (false);
create policy deny_all_search_harvest_channels on public.search_harvest_channels for all to anon, authenticated using (false) with check (false);
