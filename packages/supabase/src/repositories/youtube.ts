import { and, asc, desc, eq, getDbClient, gte, hotVideos, lte, channels, videoComments, videos, searchHarvests, searchHarvestVideos, sql, type ChannelRow, type HotVideoRow, type VideoCommentRow, type VideoRow } from '@youpd/db';
import { inArray } from 'drizzle-orm';

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

export type UpsertCommentInput = {
  commentId: string;
  videoId: string;
  authorDisplayName?: string;
  authorChannelId?: string | null;
  text: string;
  likeCount: number;
  totalReplyCount?: number;
  publishedAt?: string | null;
  updatedAt?: string | null;
};

export type UpsertHotVideoInput = {
  hotDate: string;
  videoId: string;
  source?: string;
  regionCode?: string | null;
  categoryId?: string | null;
  chartRank?: number | null;
};

export type VideoWithChannel = {
  video: VideoRow;
  channel: ChannelRow;
  position?: number;
};

function dateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * Batch upsert canonical channel rows. Existing rows refresh stats + bump
 * `last_seen_at`; `notion_page_id` cache is preserved (never overwritten by
 * a harvest, only by `markChannelNotionSynced`).
 *
 * Dedupes by `channel_id` before insert. Postgres rejects an INSERT ...
 * ON CONFLICT DO UPDATE that proposes the same conflict-target value
 * twice in a single statement (`21000`), and upstream pagination can
 * surface the same channel from two YouTube `channels.list` batches.
 * First occurrence wins.
 */
export async function upsertChannels(
  rows: UpsertChannelInput[],
): Promise<void> {
  if (rows.length === 0) return;
  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    if (seen.has(r.channelId)) return false;
    seen.add(r.channelId);
    return true;
  });
  if (unique.length === 0) return;
  const db = getDbClient();
  await db
    .insert(channels)
    .values(
      unique.map((r) => ({
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
 *
 * Dedupes by `video_id` before insert. YouTube `search.list` pagination is
 * not guaranteed unique across pages and the same `videoId` can arrive on
 * two consecutive pages; Postgres rejects the second occurrence of the
 * conflict target in a single ON CONFLICT DO UPDATE statement (`21000`).
 * First occurrence wins.
 */
export async function upsertVideos(rows: UpsertVideoInput[]): Promise<void> {
  if (rows.length === 0) return;
  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    if (seen.has(r.videoId)) return false;
    seen.add(r.videoId);
    return true;
  });
  if (unique.length === 0) return;
  const db = getDbClient();
  await db
    .insert(videos)
    .values(
      unique.map((r) => ({
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

export async function upsertCanonicalComments(
  rows: UpsertCommentInput[],
): Promise<void> {
  if (rows.length === 0) return;
  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    if (seen.has(r.commentId)) return false;
    seen.add(r.commentId);
    return true;
  });
  if (unique.length === 0) return;
  const db = getDbClient();
  await db
    .insert(videoComments)
    .values(
      unique.map((r) => ({
        commentId: r.commentId,
        videoId: r.videoId,
        authorDisplayName: r.authorDisplayName ?? '',
        authorChannelId: r.authorChannelId ?? null,
        body: r.text,
        likeCount: r.likeCount,
        totalReplyCount: r.totalReplyCount ?? 0,
        publishedAt: dateOrNull(r.publishedAt),
        updatedAt: dateOrNull(r.updatedAt),
      })),
    )
    .onConflictDoUpdate({
      target: videoComments.commentId,
      set: {
        videoId: sql`excluded.video_id`,
        authorDisplayName: sql`excluded.author_display_name`,
        authorChannelId: sql`excluded.author_channel_id`,
        body: sql`excluded.body`,
        likeCount: sql`excluded.like_count`,
        totalReplyCount: sql`excluded.total_reply_count`,
        publishedAt: sql`excluded.published_at`,
        updatedAt: sql`excluded.updated_at`,
        lastSeenAt: new Date(),
      },
    });
}

export async function upsertHotVideos(rows: UpsertHotVideoInput[]): Promise<void> {
  if (rows.length === 0) return;
  const db = getDbClient();
  await db
    .insert(hotVideos)
    .values(
      rows.map((row) => ({
        hotDate: row.hotDate,
        videoId: row.videoId,
        source: row.source ?? 'chart=mostPopular',
        regionCode: row.regionCode ?? null,
        categoryId: row.categoryId ?? null,
        chartRank: row.chartRank ?? null,
      })),
    )
    .onConflictDoUpdate({
      target: [hotVideos.hotDate, hotVideos.videoId, hotVideos.source],
      set: {
        regionCode: sql`excluded.region_code`,
        categoryId: sql`excluded.category_id`,
        chartRank: sql`excluded.chart_rank`,
      },
    });
}

export async function getLatestKeywordVideos(input: {
  keyword: string;
  limit: number;
}): Promise<VideoWithChannel[]> {
  const db = getDbClient();
  const [harvest] = await db
    .select()
    .from(searchHarvests)
    .where(eq(searchHarvests.keyword, input.keyword))
    .orderBy(desc(searchHarvests.createdAt))
    .limit(1);
  if (!harvest) return [];

  return db
    .select({
      video: videos,
      channel: channels,
      position: searchHarvestVideos.position,
    })
    .from(searchHarvestVideos)
    .innerJoin(videos, eq(searchHarvestVideos.videoId, videos.videoId))
    .innerJoin(channels, eq(videos.channelId, channels.channelId))
    .where(eq(searchHarvestVideos.harvestId, harvest.id))
    .orderBy(asc(searchHarvestVideos.position))
    .limit(input.limit);
}

export async function getVideosByIds(videoIds: string[]): Promise<VideoWithChannel[]> {
  if (videoIds.length === 0) return [];
  const db = getDbClient();
  return db
    .select({
      video: videos,
      channel: channels,
    })
    .from(videos)
    .innerJoin(channels, eq(videos.channelId, channels.channelId))
    .where(inArray(videos.videoId, videoIds));
}

export async function getHotVideos(input: {
  date?: string | null;
  dateEnd?: string | null;
  limit: number;
}): Promise<(VideoWithChannel & { hotVideo: HotVideoRow })[]> {
  const db = getDbClient();
  const dateFilter =
    input.date && input.dateEnd
      ? sql`${hotVideos.hotDate} between ${input.date} and ${input.dateEnd}`
      : input.date
        ? eq(hotVideos.hotDate, input.date)
        : input.dateEnd
          ? lte(hotVideos.hotDate, input.dateEnd)
          : gte(hotVideos.hotDate, '0001-01-01');

  return db
    .select({
      hotVideo: hotVideos,
      video: videos,
      channel: channels,
    })
    .from(hotVideos)
    .innerJoin(videos, eq(hotVideos.videoId, videos.videoId))
    .innerJoin(channels, eq(videos.channelId, channels.channelId))
    .where(dateFilter)
    .orderBy(desc(hotVideos.hotDate), asc(hotVideos.chartRank))
    .limit(input.limit);
}

export async function getCommentsByVideoIds(input: {
  videoIds: string[];
  minLikeCount?: number;
  limit: number;
}): Promise<VideoCommentRow[]> {
  if (input.videoIds.length === 0) return [];
  const db = getDbClient();
  const likeFilter =
    input.minLikeCount != null
      ? gte(videoComments.likeCount, input.minLikeCount)
      : undefined;

  return db
    .select()
    .from(videoComments)
    .where(
      likeFilter
        ? and(inArray(videoComments.videoId, input.videoIds), likeFilter)
        : inArray(videoComments.videoId, input.videoIds),
    )
    .orderBy(desc(videoComments.likeCount), desc(videoComments.publishedAt))
    .limit(input.limit);
}
