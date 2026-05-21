import {
  asc,
  inArray,
  type SQL,
} from 'drizzle-orm';
import {
  and,
  desc,
  eq,
  getDbClient,
  gte,
  lte,
  sql,
  youtubeChannelMetricSnapshots,
  youtubeChannels,
  youtubeComments,
  youtubeHarvestSessions,
  youtubeHotVideos,
  youtubeKeywords,
  youtubeKeywordVideoResults,
  youtubeVideoMetricSnapshots,
  youtubeVideos,
  type YouTubeChannelMetricSnapshotRow,
  type YouTubeChannelRow,
  type YouTubeCommentRow,
  type YouTubeHarvestSessionRow,
  type YouTubeHotVideoRow,
  type YouTubeKeywordRow,
  type YouTubeKeywordVideoResultRow,
  type YouTubeVideoMetricSnapshotRow,
  type YouTubeVideoRow,
} from '@youpd/db';

type ThumbnailSet = Record<string, { url?: string } | undefined>;

export type CanonicalVideoInput = {
  videoId: string;
  title: string;
  description?: string | null;
  channelId: string;
  channelTitle?: string;
  publishedAt?: string | null;
  thumbnails?: ThumbnailSet;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  tags?: string[];
  categoryId?: string | null;
  defaultAudioLanguage?: string | null;
  url?: string | null;
  raw?: unknown;
};

export type CanonicalChannelInput = {
  channelId: string;
  title: string;
  description?: string | null;
  publishedAt?: string | null;
  thumbnails?: ThumbnailSet;
  thumbnailUrl?: string | null;
  subscriberCount?: number | null;
  videoCount?: number | null;
  viewCount?: number | null;
  hiddenSubscriberCount?: boolean;
  averageViewCount?: number | null;
  averageViewCountBasis?: unknown;
  uploadsPlaylistId?: string | null;
  country?: string | null;
  url?: string | null;
  raw?: unknown;
};

export type CanonicalCommentInput = {
  commentId: string;
  videoId: string;
  authorDisplayName: string;
  text: string;
  likeCount: number;
  totalReplyCount?: number;
  publishedAt?: string | null;
  updatedAt?: string | null;
  parentCommentId?: string | null;
  raw?: unknown;
};

export type KeywordResultInput = {
  harvestId?: string | null;
  keyword: string;
  videoId: string;
  rank: number;
  searchOrder?: string;
  regionCode?: string;
  publishedAfter?: string | null;
  publishedBefore?: string | null;
};

export type KeywordCacheInput = {
  keyword: string;
  regionCode?: string;
  searchOrder?: string;
  harvestId: string;
  resultCount: number;
  ttlDays?: number;
};

export type KeywordCacheLookupInput = {
  keyword: string;
  regionCode?: string;
  searchOrder?: string;
  limit: number;
};

export type KeywordCacheHit = {
  keyword: YouTubeKeywordRow;
  results: {
    result: YouTubeKeywordVideoResultRow;
    video: YouTubeVideoRow;
    channel: YouTubeChannelRow | null;
  }[];
};

export type HotVideoInput = {
  hotDate: string;
  regionCode?: string;
  categoryId?: string | null;
  videoId: string;
  rank: number;
  source?: string;
};

export type VideoMetricSnapshotInput = {
  snapshotDate: string;
  videoId: string;
  viewCount?: number | null;
  likeCount?: number | null;
  commentCount?: number | null;
  source?: string;
};

export type ChannelMetricSnapshotInput = {
  snapshotDate: string;
  channelId: string;
  subscriberCount?: number | null;
  viewCount?: number | null;
  videoCount?: number | null;
  source?: string;
};

export type HarvestStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'partial_success'
  | 'failed';

export type CreateHarvestSessionInput = {
  type: string;
  query: unknown;
  status?: HarvestStatus;
};

export type CompleteHarvestSessionInput = {
  id: string;
  status: HarvestStatus;
  resultCount: number;
  error?: unknown;
};

export type QueryHotVideosInput = {
  date: string;
  dateEnd?: string | null;
  regionCode?: string;
  categoryId?: string | null;
  limit?: number;
};

export type QueryMetricSnapshotsInput = {
  ids: string[];
  dateStart?: string | null;
  dateEnd?: string | null;
};

function timestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function thumbnailUrl(input: {
  thumbnailUrl?: string | null;
  thumbnails?: ThumbnailSet;
}): string | null {
  if (input.thumbnailUrl) return input.thumbnailUrl;
  return (
    input.thumbnails?.maxres?.url ??
    input.thumbnails?.standard?.url ??
    input.thumbnails?.high?.url ??
    input.thumbnails?.medium?.url ??
    input.thumbnails?.default?.url ??
    null
  );
}

function now(): Date {
  return new Date();
}

function normalizeKeyword(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export async function createHarvestSession(
  input: CreateHarvestSessionInput,
): Promise<YouTubeHarvestSessionRow> {
  const db = getDbClient();
  const [row] = await db
    .insert(youtubeHarvestSessions)
    .values({
      type: input.type,
      query: input.query,
      status: input.status ?? 'running',
    })
    .returning();
  if (!row) throw new Error('failed to create youtube_harvest_sessions row');
  return row;
}

export async function completeHarvestSession(
  input: CompleteHarvestSessionInput,
): Promise<YouTubeHarvestSessionRow> {
  const db = getDbClient();
  const [row] = await db
    .update(youtubeHarvestSessions)
    .set({
      status: input.status,
      resultCount: input.resultCount,
      error: input.error ?? null,
      completedAt: now(),
    })
    .where(eq(youtubeHarvestSessions.id, input.id))
    .returning();
  if (!row) throw new Error(`youtube_harvest_sessions not found: ${input.id}`);
  return row;
}

export async function upsertChannels(
  channels: CanonicalChannelInput[],
): Promise<YouTubeChannelRow[]> {
  if (channels.length === 0) return [];
  const db = getDbClient();
  const collectedAt = now();
  return db
    .insert(youtubeChannels)
    .values(
      channels.map((channel) => ({
        channelId: channel.channelId,
        title: channel.title,
        description: channel.description ?? null,
        thumbnailUrl: thumbnailUrl(channel),
        publishedAt: timestamp(channel.publishedAt),
        subscriberCount: channel.subscriberCount ?? null,
        videoCount: channel.videoCount ?? null,
        viewCount: channel.viewCount ?? null,
        hiddenSubscriberCount: channel.hiddenSubscriberCount ?? false,
        averageViewCount: channel.averageViewCount ?? null,
        averageViewCountBasis: channel.averageViewCountBasis ?? null,
        uploadsPlaylistId: channel.uploadsPlaylistId ?? null,
        country: channel.country ?? null,
        url: channel.url ?? null,
        raw: channel.raw ?? null,
        collectedAt,
        updatedAt: collectedAt,
      })),
    )
    .onConflictDoUpdate({
      target: youtubeChannels.channelId,
      set: {
        title: sql`excluded.title`,
        description: sql`excluded.description`,
        thumbnailUrl: sql`excluded.thumbnail_url`,
        publishedAt: sql`excluded.published_at`,
        subscriberCount: sql`excluded.subscriber_count`,
        videoCount: sql`excluded.video_count`,
        viewCount: sql`excluded.view_count`,
        hiddenSubscriberCount: sql`excluded.hidden_subscriber_count`,
        averageViewCount: sql`coalesce(excluded.average_view_count, ${youtubeChannels.averageViewCount})`,
        averageViewCountBasis: sql`coalesce(excluded.average_view_count_basis, ${youtubeChannels.averageViewCountBasis})`,
        uploadsPlaylistId: sql`excluded.uploads_playlist_id`,
        country: sql`excluded.country`,
        url: sql`excluded.url`,
        raw: sql`excluded.raw`,
        collectedAt: sql`excluded.collected_at`,
        updatedAt: collectedAt,
      },
    })
    .returning();
}

export async function upsertVideos(
  videos: CanonicalVideoInput[],
): Promise<YouTubeVideoRow[]> {
  if (videos.length === 0) return [];
  const db = getDbClient();
  const collectedAt = now();
  return db
    .insert(youtubeVideos)
    .values(
      videos.map((video) => ({
        videoId: video.videoId,
        channelId: video.channelId || null,
        title: video.title,
        description: video.description ?? null,
        thumbnailUrl: thumbnailUrl(video),
        videoUrl: video.url ?? `https://www.youtube.com/watch?v=${video.videoId}`,
        publishedAt: timestamp(video.publishedAt),
        durationSec: video.durationSeconds ?? null,
        viewCount: video.views ?? null,
        likeCount: video.likes ?? null,
        commentCount: video.comments ?? null,
        categoryId: video.categoryId ?? null,
        tags: video.tags ?? [],
        defaultAudioLanguage: video.defaultAudioLanguage ?? null,
        raw: video.raw ?? null,
        collectedAt,
        updatedAt: collectedAt,
      })),
    )
    .onConflictDoUpdate({
      target: youtubeVideos.videoId,
      set: {
        channelId: sql`excluded.channel_id`,
        title: sql`excluded.title`,
        description: sql`excluded.description`,
        thumbnailUrl: sql`excluded.thumbnail_url`,
        videoUrl: sql`excluded.video_url`,
        publishedAt: sql`excluded.published_at`,
        durationSec: sql`excluded.duration_sec`,
        viewCount: sql`excluded.view_count`,
        likeCount: sql`excluded.like_count`,
        commentCount: sql`excluded.comment_count`,
        categoryId: sql`excluded.category_id`,
        tags: sql`excluded.tags`,
        defaultAudioLanguage: sql`excluded.default_audio_language`,
        raw: sql`excluded.raw`,
        collectedAt: sql`excluded.collected_at`,
        updatedAt: collectedAt,
      },
    })
    .returning();
}

export async function updateChannelAverageViewCount(
  channelId: string,
  videos: CanonicalVideoInput[],
  basis: unknown,
): Promise<YouTubeChannelRow | null> {
  const viewCounts = videos
    .map((video) => video.views)
    .filter((value): value is number => typeof value === 'number');
  if (viewCounts.length === 0) return null;
  const average = Math.round(
    viewCounts.reduce((sum, value) => sum + value, 0) / viewCounts.length,
  );
  const db = getDbClient();
  const [row] = await db
    .update(youtubeChannels)
    .set({
      averageViewCount: average,
      averageViewCountBasis: basis,
      updatedAt: now(),
    })
    .where(eq(youtubeChannels.channelId, channelId))
    .returning();
  return row ?? null;
}

export async function upsertComments(
  comments: CanonicalCommentInput[],
): Promise<YouTubeCommentRow[]> {
  if (comments.length === 0) return [];
  const db = getDbClient();
  const collectedAt = now();
  return db
    .insert(youtubeComments)
    .values(
      comments.map((comment) => ({
        commentId: comment.commentId,
        videoId: comment.videoId,
        authorDisplayName: comment.authorDisplayName,
        text: comment.text,
        likeCount: comment.likeCount,
        totalReplyCount: comment.totalReplyCount ?? 0,
        publishedAt: timestamp(comment.publishedAt),
        commentUpdatedAt: timestamp(comment.updatedAt),
        parentCommentId: comment.parentCommentId ?? null,
        raw: comment.raw ?? null,
        collectedAt,
      })),
    )
    .onConflictDoUpdate({
      target: youtubeComments.commentId,
      set: {
        videoId: sql`excluded.video_id`,
        authorDisplayName: sql`excluded.author_display_name`,
        text: sql`excluded.text`,
        likeCount: sql`excluded.like_count`,
        totalReplyCount: sql`excluded.total_reply_count`,
        publishedAt: sql`excluded.published_at`,
        commentUpdatedAt: sql`excluded.comment_updated_at`,
        parentCommentId: sql`excluded.parent_comment_id`,
        raw: sql`excluded.raw`,
        collectedAt: sql`excluded.collected_at`,
      },
    })
    .returning();
}

export async function upsertKeywordResults(
  results: KeywordResultInput[],
): Promise<void> {
  if (results.length === 0) return;
  const db = getDbClient();
  const collectedAt = now();
  await db
    .insert(youtubeKeywordVideoResults)
    .values(
      results.map((result) => ({
        harvestId: result.harvestId ?? null,
        keyword: result.keyword,
        videoId: result.videoId,
        rank: result.rank,
        searchOrder: result.searchOrder ?? 'relevance',
        regionCode: result.regionCode ?? 'KR',
        publishedAfter: timestamp(result.publishedAfter),
        publishedBefore: timestamp(result.publishedBefore),
        collectedAt,
      })),
    )
    .onConflictDoUpdate({
      target: [
        youtubeKeywordVideoResults.harvestId,
        youtubeKeywordVideoResults.keyword,
        youtubeKeywordVideoResults.videoId,
      ],
      set: {
        rank: sql`excluded.rank`,
        searchOrder: sql`excluded.search_order`,
        regionCode: sql`excluded.region_code`,
        publishedAfter: sql`excluded.published_after`,
        publishedBefore: sql`excluded.published_before`,
        collectedAt: sql`excluded.collected_at`,
      },
    });
}

export async function upsertKeywordCache(
  input: KeywordCacheInput,
): Promise<YouTubeKeywordRow> {
  const db = getDbClient();
  const collectedAt = now();
  const ttlDays = input.ttlDays ?? 7;
  const cacheExpiresAt = new Date(
    collectedAt.getTime() + ttlDays * 24 * 60 * 60 * 1000,
  );
  const [row] = await db
    .insert(youtubeKeywords)
    .values({
      keyword: input.keyword.trim(),
      normalizedKeyword: normalizeKeyword(input.keyword),
      regionCode: input.regionCode ?? 'KR',
      searchOrder: input.searchOrder ?? 'relevance',
      lastHarvestId: input.harvestId,
      lastCollectedAt: collectedAt,
      cacheExpiresAt,
      resultCount: input.resultCount,
      updatedAt: collectedAt,
    })
    .onConflictDoUpdate({
      target: [
        youtubeKeywords.normalizedKeyword,
        youtubeKeywords.regionCode,
        youtubeKeywords.searchOrder,
      ],
      set: {
        keyword: sql`excluded.keyword`,
        lastHarvestId: sql`excluded.last_harvest_id`,
        lastCollectedAt: sql`excluded.last_collected_at`,
        cacheExpiresAt: sql`excluded.cache_expires_at`,
        resultCount: sql`excluded.result_count`,
        updatedAt: collectedAt,
      },
    })
    .returning();
  if (!row) throw new Error('failed to upsert youtube_keywords row');
  return row;
}

export async function getFreshKeywordCache(
  input: KeywordCacheLookupInput,
): Promise<KeywordCacheHit | null> {
  const db = getDbClient();
  const [keyword] = await db
    .select()
    .from(youtubeKeywords)
    .where(
      and(
        eq(youtubeKeywords.normalizedKeyword, normalizeKeyword(input.keyword)),
        eq(youtubeKeywords.regionCode, input.regionCode ?? 'KR'),
        eq(youtubeKeywords.searchOrder, input.searchOrder ?? 'relevance'),
      ),
    )
    .limit(1);

  if (!keyword?.lastHarvestId || !keyword.cacheExpiresAt) return null;
  if (keyword.cacheExpiresAt.getTime() <= Date.now()) return null;
  if (keyword.resultCount < input.limit) return null;

  const rows = await db
    .select({
      result: youtubeKeywordVideoResults,
      video: youtubeVideos,
      channel: youtubeChannels,
    })
    .from(youtubeKeywordVideoResults)
    .innerJoin(
      youtubeVideos,
      eq(youtubeKeywordVideoResults.videoId, youtubeVideos.videoId),
    )
    .leftJoin(youtubeChannels, eq(youtubeVideos.channelId, youtubeChannels.channelId))
    .where(eq(youtubeKeywordVideoResults.harvestId, keyword.lastHarvestId))
    .orderBy(asc(youtubeKeywordVideoResults.rank))
    .limit(input.limit);

  if (rows.length < input.limit) return null;
  return { keyword, results: rows };
}

export async function upsertHotVideos(results: HotVideoInput[]): Promise<void> {
  if (results.length === 0) return;
  const db = getDbClient();
  const collectedAt = now();
  for (const result of results) {
    await db.execute(sql`
      insert into public.youtube_hot_videos (
        hot_date,
        region_code,
        category_id,
        video_id,
        rank,
        source,
        collected_at
      )
      values (
        ${result.hotDate},
        ${result.regionCode ?? 'KR'},
        ${result.categoryId ?? null},
        ${result.videoId},
        ${result.rank},
        ${result.source ?? 'youtube_trending'},
        ${collectedAt}
      )
      on conflict (hot_date, region_code, coalesce(category_id, ''), video_id)
      do update set
        rank = excluded.rank,
        source = excluded.source,
        collected_at = excluded.collected_at
    `);
  }
}

export async function upsertVideoMetricSnapshots(
  snapshots: VideoMetricSnapshotInput[],
): Promise<YouTubeVideoMetricSnapshotRow[]> {
  if (snapshots.length === 0) return [];
  const db = getDbClient();
  const collectedAt = now();
  return db
    .insert(youtubeVideoMetricSnapshots)
    .values(
      snapshots.map((snapshot) => ({
        snapshotDate: snapshot.snapshotDate,
        videoId: snapshot.videoId,
        viewCount: snapshot.viewCount ?? null,
        likeCount: snapshot.likeCount ?? null,
        commentCount: snapshot.commentCount ?? null,
        source: snapshot.source ?? 'video_detail',
        collectedAt,
      })),
    )
    .onConflictDoUpdate({
      target: [
        youtubeVideoMetricSnapshots.snapshotDate,
        youtubeVideoMetricSnapshots.videoId,
      ],
      set: {
        viewCount: sql`excluded.view_count`,
        likeCount: sql`excluded.like_count`,
        commentCount: sql`excluded.comment_count`,
        source: sql`excluded.source`,
        collectedAt: sql`excluded.collected_at`,
      },
    })
    .returning();
}

export async function upsertChannelMetricSnapshots(
  snapshots: ChannelMetricSnapshotInput[],
): Promise<YouTubeChannelMetricSnapshotRow[]> {
  if (snapshots.length === 0) return [];
  const db = getDbClient();
  const collectedAt = now();
  return db
    .insert(youtubeChannelMetricSnapshots)
    .values(
      snapshots.map((snapshot) => ({
        snapshotDate: snapshot.snapshotDate,
        channelId: snapshot.channelId,
        subscriberCount: snapshot.subscriberCount ?? null,
        viewCount: snapshot.viewCount ?? null,
        videoCount: snapshot.videoCount ?? null,
        source: snapshot.source ?? 'channel_detail',
        collectedAt,
      })),
    )
    .onConflictDoUpdate({
      target: [
        youtubeChannelMetricSnapshots.snapshotDate,
        youtubeChannelMetricSnapshots.channelId,
      ],
      set: {
        subscriberCount: sql`excluded.subscriber_count`,
        viewCount: sql`excluded.view_count`,
        videoCount: sql`excluded.video_count`,
        source: sql`excluded.source`,
        collectedAt: sql`excluded.collected_at`,
      },
    })
    .returning();
}

export async function queryHotVideos(
  input: QueryHotVideosInput,
): Promise<
  {
    hotVideo: YouTubeHotVideoRow;
    video: YouTubeVideoRow | null;
    channel: YouTubeChannelRow | null;
  }[]
> {
  const db = getDbClient();
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const clauses: SQL[] = [eq(youtubeHotVideos.regionCode, input.regionCode ?? 'KR')];
  if (input.dateEnd) {
    clauses.push(gte(youtubeHotVideos.hotDate, input.date));
    clauses.push(lte(youtubeHotVideos.hotDate, input.dateEnd));
  } else {
    clauses.push(eq(youtubeHotVideos.hotDate, input.date));
  }
  if (input.categoryId !== undefined) {
    clauses.push(
      input.categoryId === null
        ? sql`${youtubeHotVideos.categoryId} is null`
        : eq(youtubeHotVideos.categoryId, input.categoryId),
    );
  }

  const rows = await db
    .select({
      hotVideo: youtubeHotVideos,
      video: youtubeVideos,
      channel: youtubeChannels,
    })
    .from(youtubeHotVideos)
    .leftJoin(youtubeVideos, eq(youtubeHotVideos.videoId, youtubeVideos.videoId))
    .leftJoin(youtubeChannels, eq(youtubeVideos.channelId, youtubeChannels.channelId))
    .where(and(...clauses))
    .orderBy(youtubeHotVideos.hotDate, youtubeHotVideos.rank)
    .limit(limit);
  return rows;
}

export async function getKeywordSummary(input: {
  keyword: string;
  regionCode?: string;
  lookbackDays?: number;
  limit?: number;
}): Promise<{
  keyword: string;
  videoCount: number;
  totalViewCount: number;
  averageViewCount: number | null;
  medianViewCount: number | null;
  top10ViewCount: number;
  lastCollectedAt: Date | null;
}> {
  const db = getDbClient();
  const lookbackDays = input.lookbackDays ?? 30;
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
  const limit = Math.min(Math.max(input.limit ?? 300, 1), 500);
  const rows = await db
    .select({
      views: youtubeVideos.viewCount,
      collectedAt: youtubeKeywordVideoResults.collectedAt,
    })
    .from(youtubeKeywordVideoResults)
    .innerJoin(
      youtubeVideos,
      eq(youtubeKeywordVideoResults.videoId, youtubeVideos.videoId),
    )
    .where(
      and(
        eq(youtubeKeywordVideoResults.keyword, input.keyword),
        eq(youtubeKeywordVideoResults.regionCode, input.regionCode ?? 'KR'),
        gte(youtubeKeywordVideoResults.collectedAt, since),
      ),
    )
    .orderBy(desc(youtubeKeywordVideoResults.collectedAt))
    .limit(limit);

  const views = rows
    .map((row) => row.views)
    .filter((value): value is number => typeof value === 'number')
    .sort((a, b) => a - b);
  const total = views.reduce((sum, value) => sum + value, 0);
  const median =
    views.length === 0
      ? null
      : views.length % 2 === 1
        ? views[Math.floor(views.length / 2)]!
        : Math.round(
            (views[views.length / 2 - 1]! + views[views.length / 2]!) / 2,
          );
  const top10 = [...views]
    .sort((a, b) => b - a)
    .slice(0, 10)
    .reduce((sum, value) => sum + value, 0);

  return {
    keyword: input.keyword,
    videoCount: rows.length,
    totalViewCount: total,
    averageViewCount: views.length === 0 ? null : Math.round(total / views.length),
    medianViewCount: median,
    top10ViewCount: top10,
    lastCollectedAt: rows[0]?.collectedAt ?? null,
  };
}

export async function getChannelSummary(input: {
  channelId: string;
  recentVideoLimit?: number;
}): Promise<{
  channel: YouTubeChannelRow | null;
  recentVideos: YouTubeVideoRow[];
  averageViewCount: number | null;
}> {
  const db = getDbClient();
  const [channel] = await db
    .select()
    .from(youtubeChannels)
    .where(eq(youtubeChannels.channelId, input.channelId))
    .limit(1);
  const recentVideos = await db
    .select()
    .from(youtubeVideos)
    .where(eq(youtubeVideos.channelId, input.channelId))
    .orderBy(desc(youtubeVideos.publishedAt))
    .limit(Math.min(Math.max(input.recentVideoLimit ?? 30, 1), 100));
  const viewCounts = recentVideos
    .map((video) => video.viewCount)
    .filter((value): value is number => typeof value === 'number');
  return {
    channel: channel ?? null,
    recentVideos,
    averageViewCount:
      viewCounts.length === 0
        ? channel?.averageViewCount ?? null
        : Math.round(viewCounts.reduce((sum, value) => sum + value, 0) / viewCounts.length),
  };
}

export async function queryVideoMetricSnapshots(
  input: QueryMetricSnapshotsInput,
): Promise<YouTubeVideoMetricSnapshotRow[]> {
  if (input.ids.length === 0) return [];
  const db = getDbClient();
  const clauses: SQL[] = [inArray(youtubeVideoMetricSnapshots.videoId, input.ids)];
  if (input.dateStart) {
    clauses.push(gte(youtubeVideoMetricSnapshots.snapshotDate, input.dateStart));
  }
  if (input.dateEnd) {
    clauses.push(lte(youtubeVideoMetricSnapshots.snapshotDate, input.dateEnd));
  }
  return db
    .select()
    .from(youtubeVideoMetricSnapshots)
    .where(and(...clauses))
    .orderBy(youtubeVideoMetricSnapshots.videoId, youtubeVideoMetricSnapshots.snapshotDate);
}

export async function queryChannelMetricSnapshots(
  input: QueryMetricSnapshotsInput,
): Promise<YouTubeChannelMetricSnapshotRow[]> {
  if (input.ids.length === 0) return [];
  const db = getDbClient();
  const clauses: SQL[] = [
    inArray(youtubeChannelMetricSnapshots.channelId, input.ids),
  ];
  if (input.dateStart) {
    clauses.push(gte(youtubeChannelMetricSnapshots.snapshotDate, input.dateStart));
  }
  if (input.dateEnd) {
    clauses.push(lte(youtubeChannelMetricSnapshots.snapshotDate, input.dateEnd));
  }
  return db
    .select()
    .from(youtubeChannelMetricSnapshots)
    .where(and(...clauses))
    .orderBy(
      youtubeChannelMetricSnapshots.channelId,
      youtubeChannelMetricSnapshots.snapshotDate,
    );
}
