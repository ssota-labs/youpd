-- Drop Notion harvest + canonical query tables; youtube_* is the sole SSOT.

drop table if exists public.search_harvest_videos cascade;
drop table if exists public.search_harvest_channels cascade;
drop table if exists public.search_harvests cascade;
drop table if exists public.hot_videos cascade;
drop table if exists public.video_comments cascade;
drop table if exists public.videos cascade;
drop table if exists public.channels cascade;
drop table if exists public.youtube_comments cascade;
