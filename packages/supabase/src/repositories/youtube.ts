import { eq, getDbClient, channels, videos, sql } from '@youpd/db';

export type UpsertChannelInput = {
  channelId: string;
  title: string | null;
  subscriberCount: number | null;
  viewCount: number | null;
  videoCount: number | null;
  publishedAt: Date | null;
  url: string | null;
};

export type UpsertVideoInput = {
  videoId: string;
  channelId: string;
  title: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  durationSec: number | null;
  publishedAt: Date | null;
  url: string | null;
};

/**
 * Batch upsert canonical channel rows. Existing rows refresh stats + bump
 * `last_seen_at`; `notion_page_id` cache is preserved (never overwritten by
 * a harvest, only by `markChannelNotionSynced`).
 */
export async function upsertChannels(
  rows: UpsertChannelInput[],
): Promise<void> {
  if (rows.length === 0) return;
  const db = getDbClient();
  await db
    .insert(channels)
    .values(
      rows.map((r) => ({
        channelId: r.channelId,
        title: r.title,
        subscriberCount: r.subscriberCount,
        viewCount: r.viewCount,
        videoCount: r.videoCount,
        publishedAt: r.publishedAt,
        url: r.url,
      })),
    )
    .onConflictDoUpdate({
      target: channels.channelId,
      set: {
        title: sql`excluded.title`,
        subscriberCount: sql`excluded.subscriber_count`,
        viewCount: sql`excluded.view_count`,
        videoCount: sql`excluded.video_count`,
        publishedAt: sql`excluded.published_at`,
        url: sql`excluded.url`,
        lastSeenAt: new Date(),
      },
    });
}

/**
 * Batch upsert canonical video rows. Same `notion_page_id` preservation rule
 * as channels — sync metadata is mutated only via `markVideoNotionSynced`.
 */
export async function upsertVideos(rows: UpsertVideoInput[]): Promise<void> {
  if (rows.length === 0) return;
  const db = getDbClient();
  await db
    .insert(videos)
    .values(
      rows.map((r) => ({
        videoId: r.videoId,
        channelId: r.channelId,
        title: r.title,
        views: r.views,
        likes: r.likes,
        comments: r.comments,
        durationSec: r.durationSec,
        publishedAt: r.publishedAt,
        url: r.url,
      })),
    )
    .onConflictDoUpdate({
      target: videos.videoId,
      set: {
        channelId: sql`excluded.channel_id`,
        title: sql`excluded.title`,
        views: sql`excluded.views`,
        likes: sql`excluded.likes`,
        comments: sql`excluded.comments`,
        durationSec: sql`excluded.duration_sec`,
        publishedAt: sql`excluded.published_at`,
        url: sql`excluded.url`,
        lastSeenAt: new Date(),
      },
    });
}

/** Set notion_page_id + notion_synced_at for a single channel. */
export async function markChannelNotionSynced(
  channelId: string,
  notionPageId: string,
): Promise<void> {
  const db = getDbClient();
  await db
    .update(channels)
    .set({
      notionPageId,
      notionSyncedAt: new Date(),
    })
    .where(eq(channels.channelId, channelId));
}

/** Set notion_page_id + notion_synced_at for a single video. */
export async function markVideoNotionSynced(
  videoId: string,
  notionPageId: string,
): Promise<void> {
  const db = getDbClient();
  await db
    .update(videos)
    .set({
      notionPageId,
      notionSyncedAt: new Date(),
    })
    .where(eq(videos.videoId, videoId));
}
