-- Short-form classification: duration under 60 seconds (1 minute).
alter table public.youtube_videos
  add column if not exists is_short boolean;

update public.youtube_videos
set is_short = duration_sec < 60
where duration_sec is not null
  and is_short is null;
