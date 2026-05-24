-- Allow the same video to appear under multiple hot-video sources on the same day
-- (e.g. youtube_trending and keyword_promoted).

drop index if exists public.youtube_hot_videos_snapshot_uidx;

create unique index if not exists youtube_hot_videos_snapshot_source_uidx
  on public.youtube_hot_videos (
    hot_date,
    region_code,
    coalesce(category_id, ''),
    video_id,
    source
  );
