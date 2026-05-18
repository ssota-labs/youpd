import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import {
  getDbClient,
  hotVideos,
  searchHarvestChannels,
  searchHarvestVideos,
  searchHarvests,
  youtubeChannels,
  youtubeComments,
  youtubeVideos,
  type HotVideoRow,
  type SearchHarvestRow,
  type YoutubeChannelRow,
  type YoutubeCommentRow,
  type YoutubeVideoRow,
} from '@youpd/db';

function dateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

function averageViews(
  viewCount: number | null | undefined,
  videoCount: number | null | undefined,
): number | null {
  if (viewCount == null || videoCount == null || videoCount <= 0) return null;
  return Math.floor(viewCount / videoCount);
}

export type CanonicalChannelInput = {
  channelId: string;
  title: string;
  description?: string;
  thumbnails?: unknown;
  subscriberCount?: number | null;
  viewCount?: number | null;
  videoCount?: number | null;
  averageViewCount?: number | null;
  hiddenSubscriberCount?: boolean | null;
  uploadsPlaylistId?: string | null;
  country?: string | null;
  url: string;
  publishedAt?: string | null;
};

export type CanonicalVideoInput = {
  videoId: string;
  channelId: string;
  title: string;
  description?: string;
  thumbnails?: unknown;
  durationSeconds?: number | null;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  tags?: string[];
  categoryId?: string | null;
  defaultAudioLanguage?: string | null;
  url: string;
  publishedAt?: string | null;
};

export type CanonicalCommentInput = {
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

export type HotVideoInput = {
  hotDate: string;
  videoId: string;
  source?: string;
  regionCode?: string | null;
  categoryId?: string | null;
  chartRank?: number | null;
};

export type VideoWithChannel = {
  video: YoutubeVideoRow;
  channel: YoutubeChannelRow;
  position?: number;
};

export async function upsertCanonicalChannels(
  rows: CanonicalChannelInput[],
): Promise<YoutubeChannelRow[]> {
  if (rows.length === 0) return [];
  const db = getDbClient();
  return db
    .insert(youtubeChannels)
    .values(
      rows.map((row) => ({
        channelId: row.channelId,
        title: row.title,
        description: row.description ?? '',
        thumbnails: row.thumbnails ?? {},
        subscriberCount: row.subscriberCount ?? null,
        viewCount: row.viewCount ?? null,
        videoCount: row.videoCount ?? null,
        averageViewCount:
          row.averageViewCount ?? averageViews(row.viewCount, row.videoCount),
        hiddenSubscriberCount: row.hiddenSubscriberCount ?? false,
        uploadsPlaylistId: row.uploadsPlaylistId ?? null,
        country: row.country ?? null,
        url: row.url,
        publishedAt: dateOrNull(row.publishedAt),
      })),
    )
    .onConflictDoUpdate({
      target: youtubeChannels.channelId,
      set: {
        title: sql`excluded.title`,
        description: sql`excluded.description`,
        thumbnails: sql`excluded.thumbnails`,
        subscriberCount: sql`excluded.subscriber_count`,
        viewCount: sql`excluded.view_count`,
        videoCount: sql`excluded.video_count`,
        averageViewCount: sql`excluded.average_view_count`,
        hiddenSubscriberCount: sql`excluded.hidden_subscriber_count`,
        uploadsPlaylistId: sql`excluded.uploads_playlist_id`,
        country: sql`excluded.country`,
        url: sql`excluded.url`,
        publishedAt: sql`excluded.published_at`,
        lastSeenAt: sql`now()`,
      },
    })
    .returning();
}

export async function upsertCanonicalVideos(
  rows: CanonicalVideoInput[],
): Promise<YoutubeVideoRow[]> {
  if (rows.length === 0) return [];
  const db = getDbClient();
  return db
    .insert(youtubeVideos)
    .values(
      rows.map((row) => ({
        videoId: row.videoId,
        channelId: row.channelId,
        title: row.title,
        description: row.description ?? '',
        thumbnails: row.thumbnails ?? {},
        durationSec: row.durationSeconds ?? null,
        viewCount: row.views ?? null,
        likeCount: row.likes ?? null,
        commentCount: row.comments ?? null,
        tags: row.tags ?? [],
        categoryId: row.categoryId ?? null,
        defaultAudioLanguage: row.defaultAudioLanguage ?? null,
        url: row.url,
        publishedAt: dateOrNull(row.publishedAt),
      })),
    )
    .onConflictDoUpdate({
      target: youtubeVideos.videoId,
      set: {
        channelId: sql`excluded.channel_id`,
        title: sql`excluded.title`,
        description: sql`excluded.description`,
        thumbnails: sql`excluded.thumbnails`,
        durationSec: sql`excluded.duration_sec`,
        viewCount: sql`excluded.view_count`,
        likeCount: sql`excluded.like_count`,
        commentCount: sql`excluded.comment_count`,
        tags: sql`excluded.tags`,
        categoryId: sql`excluded.category_id`,
        defaultAudioLanguage: sql`excluded.default_audio_language`,
        url: sql`excluded.url`,
        publishedAt: sql`excluded.published_at`,
        lastSeenAt: sql`now()`,
      },
    })
    .returning();
}

export async function upsertCanonicalComments(
  rows: CanonicalCommentInput[],
): Promise<YoutubeCommentRow[]> {
  if (rows.length === 0) return [];
  const db = getDbClient();
  return db
    .insert(youtubeComments)
    .values(
      rows.map((row) => ({
        commentId: row.commentId,
        videoId: row.videoId,
        authorDisplayName: row.authorDisplayName ?? '',
        authorChannelId: row.authorChannelId ?? null,
        body: row.text,
        likeCount: row.likeCount,
        totalReplyCount: row.totalReplyCount ?? 0,
        publishedAt: dateOrNull(row.publishedAt),
        updatedAt: dateOrNull(row.updatedAt),
      })),
    )
    .onConflictDoUpdate({
      target: youtubeComments.commentId,
      set: {
        videoId: sql`excluded.video_id`,
        authorDisplayName: sql`excluded.author_display_name`,
        authorChannelId: sql`excluded.author_channel_id`,
        body: sql`excluded.body`,
        likeCount: sql`excluded.like_count`,
        totalReplyCount: sql`excluded.total_reply_count`,
        publishedAt: sql`excluded.published_at`,
        updatedAt: sql`excluded.updated_at`,
        lastSeenAt: sql`now()`,
      },
    })
    .returning();
}

export async function createSearchHarvest(input: {
  keyword: string;
  quotaSessionId?: string | null;
  videos: CanonicalVideoInput[];
  channels: CanonicalChannelInput[];
}): Promise<SearchHarvestRow> {
  const db = getDbClient();
  const [row] = await db
    .insert(searchHarvests)
    .values({
      keyword: input.keyword,
      quotaSessionId: input.quotaSessionId ?? null,
      totalVideos: input.videos.length,
      totalChannels: input.channels.length,
    })
    .returning();
  if (!row) throw new Error('failed to insert search_harvests row');

  if (input.videos.length > 0) {
    await db
      .insert(searchHarvestVideos)
      .values(
        input.videos.map((video, index) => ({
          harvestId: row.id,
          videoId: video.videoId,
          position: index,
        })),
      )
      .onConflictDoNothing();
  }

  if (input.channels.length > 0) {
    await db
      .insert(searchHarvestChannels)
      .values(
        input.channels.map((channel) => ({
          harvestId: row.id,
          channelId: channel.channelId,
        })),
      )
      .onConflictDoNothing();
  }

  return row;
}

export async function persistKeywordHarvest(input: {
  keyword: string;
  quotaSessionId?: string | null;
  videos: CanonicalVideoInput[];
  channels: CanonicalChannelInput[];
}): Promise<SearchHarvestRow> {
  await upsertCanonicalChannels(input.channels);
  await upsertCanonicalVideos(input.videos);
  return createSearchHarvest(input);
}

export async function upsertHotVideos(rows: HotVideoInput[]): Promise<HotVideoRow[]> {
  if (rows.length === 0) return [];
  const db = getDbClient();
  return db
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
    })
    .returning();
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
      video: youtubeVideos,
      channel: youtubeChannels,
      position: searchHarvestVideos.position,
    })
    .from(searchHarvestVideos)
    .innerJoin(youtubeVideos, eq(searchHarvestVideos.videoId, youtubeVideos.videoId))
    .innerJoin(youtubeChannels, eq(youtubeVideos.channelId, youtubeChannels.channelId))
    .where(eq(searchHarvestVideos.harvestId, harvest.id))
    .orderBy(asc(searchHarvestVideos.position))
    .limit(input.limit);
}

export async function getVideosByIds(videoIds: string[]): Promise<VideoWithChannel[]> {
  if (videoIds.length === 0) return [];
  const db = getDbClient();
  return db
    .select({
      video: youtubeVideos,
      channel: youtubeChannels,
    })
    .from(youtubeVideos)
    .innerJoin(youtubeChannels, eq(youtubeVideos.channelId, youtubeChannels.channelId))
    .where(inArray(youtubeVideos.videoId, videoIds));
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
      video: youtubeVideos,
      channel: youtubeChannels,
    })
    .from(hotVideos)
    .innerJoin(youtubeVideos, eq(hotVideos.videoId, youtubeVideos.videoId))
    .innerJoin(youtubeChannels, eq(youtubeVideos.channelId, youtubeChannels.channelId))
    .where(dateFilter)
    .orderBy(desc(hotVideos.hotDate), asc(hotVideos.chartRank))
    .limit(input.limit);
}

export async function getCommentsByVideoIds(input: {
  videoIds: string[];
  minLikeCount?: number;
  limit: number;
}): Promise<YoutubeCommentRow[]> {
  if (input.videoIds.length === 0) return [];
  const db = getDbClient();
  const likeFilter =
    input.minLikeCount != null
      ? gte(youtubeComments.likeCount, input.minLikeCount)
      : undefined;

  return db
    .select()
    .from(youtubeComments)
    .where(
      likeFilter
        ? and(inArray(youtubeComments.videoId, input.videoIds), likeFilter)
        : inArray(youtubeComments.videoId, input.videoIds),
    )
    .orderBy(desc(youtubeComments.likeCount), desc(youtubeComments.publishedAt))
    .limit(input.limit);
}
