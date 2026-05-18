create table if not exists public.video_comments (
  comment_id text primary key,
  video_id text not null references public.videos(video_id) on delete cascade,
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

create index if not exists video_comments_video_id_idx
  on public.video_comments(video_id);
create index if not exists video_comments_like_count_idx
  on public.video_comments(like_count);

alter table public.video_comments enable row level security;
drop policy if exists "deny_all" on public.video_comments;
create policy "deny_all"
  on public.video_comments
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.hot_videos (
  id uuid primary key default gen_random_uuid(),
  hot_date date not null,
  video_id text not null references public.videos(video_id) on delete cascade,
  source text not null default 'chart=mostPopular',
  region_code text,
  category_id text,
  chart_rank integer,
  created_at timestamptz not null default now()
);

create unique index if not exists hot_videos_hot_date_video_id_source_unique
  on public.hot_videos(hot_date, video_id, source);
create index if not exists hot_videos_hot_date_idx
  on public.hot_videos(hot_date);
create index if not exists hot_videos_video_id_idx
  on public.hot_videos(video_id);

alter table public.hot_videos enable row level security;
drop policy if exists "deny_all" on public.hot_videos;
create policy "deny_all"
  on public.hot_videos
  for all
  to anon, authenticated
  using (false)
  with check (false);
