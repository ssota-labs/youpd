import {
  asc,
  count,
  ilike,
  inArray,
  or,
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
  youtubeHarvestSessions,
  youtubeHotVideos,
  youtubeKeywords,
  youtubeKeywordVideoResults,
  youtubeVideoMetricSnapshots,
  youtubeVideos,
  type YouTubeChannelMetricSnapshotRow,
  type YouTubeChannelRow,
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
  title: string | null;
  description?: string | null;
  channelId: string;
  channelTitle?: string;
  publishedAt?: string | Date | null;
  thumbnails?: ThumbnailSet;
  thumbnailUrl?: string | null;
  durationSec?: number | null;
  durationSeconds?: number | null;
  isShort?: boolean | null;
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
  title: string | null;
  description?: string | null;
  publishedAt?: string | Date | null;
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

export type UpsertChannelInput = CanonicalChannelInput;
export type UpsertVideoInput = CanonicalVideoInput;

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
  rank?: number;
  chartRank?: number | null;
  source?: string;
};

export type UpsertHotVideoInput = HotVideoInput;

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

export type HotVideoSortField =
  | 'views'
  | 'subscribers'
  | 'contribution'
  | 'performance'
  | 'duration'
  | 'videoCount'
  | 'publishedAt';

export type HotVideoSortOrder = 'asc' | 'desc';

export type HotVideoScoreGrade =
  | 'Unknown'
  | 'Worst'
  | 'Bad'
  | 'Normal'
  | 'Good'
  | 'Great';

export type HotVideoScoreLogic = 'or' | 'and';

export type SearchHotVideosInput = {
  regionCode?: string;
  date?: string | null;
  dateEnd?: string | null;
  categoryId?: string | null;
  source?: string | string[] | null;
  q?: string | null;
  limit?: number;
  offset?: number;
  sort?: HotVideoSortField;
  order?: HotVideoSortOrder;
  isShort?: boolean | null;
  minPerformanceGrade?: HotVideoScoreGrade | null;
  minContributionGrade?: HotVideoScoreGrade | null;
  scoreLogic?: HotVideoScoreLogic;
  minSubscribers?: number;
  maxSubscribers?: number;
  minViews?: number;
  maxViews?: number;
  publishedAfter?: string;
  publishedBefore?: string;
  performanceGrades?: HotVideoScoreGrade[];
  contributionGrades?: HotVideoScoreGrade[];
};

export const HOT_VIDEO_SOURCE_YOUTUBE_TRENDING = 'youtube_trending';
export const HOT_VIDEO_SOURCE_KEYWORD_PROMOTED = 'keyword_promoted';

/** Minimum performance/contribution grade for keyword → hot video promotion (Good+ only). */
export const KEYWORD_PROMOTION_MIN_SCORE_GRADE: HotVideoScoreGrade = 'Good';

export type KeywordHarvestSessionSummary = {
  id: string;
  keyword: string;
  regionCode: string;
  searchOrder: string;
  limit: number;
  forceRefresh: boolean;
  status: HarvestStatus;
  resultCount: number;
  startedAt: Date;
  completedAt: Date | null;
};

export type KeywordHarvestResultRow = {
  result: YouTubeKeywordVideoResultRow;
  video: YouTubeVideoRow;
  channel: YouTubeChannelRow | null;
  performanceRatio: number | null;
  contributionRatio: number | null;
  promoted: boolean;
};

export type PromotableKeywordResultRow = {
  videoId: string;
  regionCode: string;
  categoryId: string | null;
  keyword: string;
  keywordRank: number;
  performanceRatio: number;
  contributionRatio: number;
};

export type SearchHotVideosResult = {
  rows: {
    hotVideo: YouTubeHotVideoRow;
    video: YouTubeVideoRow | null;
    channel: YouTubeChannelRow | null;
  }[];
  total: number;
  hasMore: boolean;
};

export type QueryMetricSnapshotsInput = {
  ids: string[];
  dateStart?: string | null;
  dateEnd?: string | null;
};

function timestamp(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
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

function resolveIsShort(video: CanonicalVideoInput): boolean | null {
  if (video.isShort !== undefined) return video.isShort;
  const durationSec = video.durationSeconds ?? video.durationSec ?? null;
  if (durationSec == null) return null;
  return durationSec < 60;
}

function normalizeKeyword(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function minGradeToRatioThreshold(grade: HotVideoScoreGrade): number | null {
  switch (grade) {
    case 'Great':
      return 100;
    case 'Good':
      return 10;
    case 'Normal':
      return 1;
    case 'Bad':
      return 0.1;
    case 'Worst':
      return 0;
    case 'Unknown':
      return null;
  }
}

const performanceRatioSql = sql`case
  when ${youtubeChannels.subscriberCount} > 0
  then ${youtubeVideos.viewCount}::float / ${youtubeChannels.subscriberCount}
  else null
end`;

const contributionRatioSql = sql`case
  when ${youtubeChannels.averageViewCount} > 0
  then ${youtubeVideos.viewCount}::float / ${youtubeChannels.averageViewCount}
  else null
end`;

function gradeRangeClause(
  ratioSql: SQL,
  grade: HotVideoScoreGrade,
): SQL | null {
  switch (grade) {
    case 'Worst':
      return sql`${ratioSql} is not null and ${ratioSql} < 0.1`;
    case 'Bad':
      return sql`${ratioSql} >= 0.1 and ${ratioSql} < 1`;
    case 'Normal':
      return sql`${ratioSql} >= 1 and ${ratioSql} < 10`;
    case 'Good':
      return sql`${ratioSql} >= 10 and ${ratioSql} < 100`;
    case 'Great':
      return sql`${ratioSql} >= 100`;
    case 'Unknown':
      return sql`${ratioSql} is null`;
    default:
      return null;
  }
}

function buildGradeListClause(
  ratioSql: SQL,
  grades: HotVideoScoreGrade[] | undefined,
): SQL | null {
  if (!grades || grades.length === 0) return null;

  const clauses = grades
    .map((grade) => gradeRangeClause(ratioSql, grade))
    .filter((clause): clause is SQL => clause != null);

  if (clauses.length === 0) return null;
  if (clauses.length === 1) return clauses[0]!;

  return or(...clauses) ?? null;
}

function buildScoreFilterClause(input: {
  minPerformanceGrade?: HotVideoScoreGrade | null;
  minContributionGrade?: HotVideoScoreGrade | null;
  performanceGrades?: HotVideoScoreGrade[];
  contributionGrades?: HotVideoScoreGrade[];
  scoreLogic?: HotVideoScoreLogic;
}): SQL | null {
  const perfClause =
    buildGradeListClause(performanceRatioSql, input.performanceGrades) ??
    (input.minPerformanceGrade != null
      ? sql`${performanceRatioSql} >= ${minGradeToRatioThreshold(input.minPerformanceGrade)}`
      : null);
  const contribClause =
    buildGradeListClause(contributionRatioSql, input.contributionGrades) ??
    (input.minContributionGrade != null
      ? sql`${contributionRatioSql} >= ${minGradeToRatioThreshold(input.minContributionGrade)}`
      : null);

  if (perfClause && contribClause) {
    return input.scoreLogic === 'and'
      ? sql`(${perfClause} and ${contribClause})`
      : sql`(${perfClause} or ${contribClause})`;
  }
  if (perfClause) return perfClause;
  if (contribClause) return contribClause;
  return null;
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
  rows: CanonicalChannelInput[],
): Promise<YouTubeChannelRow[]> {
  if (rows.length === 0) return [];
  const seen = new Set<string>();
  const channelRows = rows.filter((channel) => {
    if (seen.has(channel.channelId)) return false;
    seen.add(channel.channelId);
    return true;
  });
  const db = getDbClient();
  const collectedAt = now();
  return db
    .insert(youtubeChannels)
    .values(
      channelRows.map((channel) => ({
        channelId: channel.channelId,
        title: channel.title ?? '',
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
        description: sql`coalesce(excluded.description, ${youtubeChannels.description})`,
        thumbnailUrl: sql`coalesce(excluded.thumbnail_url, ${youtubeChannels.thumbnailUrl})`,
        publishedAt: sql`coalesce(excluded.published_at, ${youtubeChannels.publishedAt})`,
        subscriberCount: sql`coalesce(excluded.subscriber_count, ${youtubeChannels.subscriberCount})`,
        videoCount: sql`coalesce(excluded.video_count, ${youtubeChannels.videoCount})`,
        viewCount: sql`coalesce(excluded.view_count, ${youtubeChannels.viewCount})`,
        hiddenSubscriberCount: sql`excluded.hidden_subscriber_count`,
        averageViewCount: sql`coalesce(excluded.average_view_count, ${youtubeChannels.averageViewCount})`,
        averageViewCountBasis: sql`coalesce(excluded.average_view_count_basis, ${youtubeChannels.averageViewCountBasis})`,
        uploadsPlaylistId: sql`coalesce(excluded.uploads_playlist_id, ${youtubeChannels.uploadsPlaylistId})`,
        country: sql`coalesce(excluded.country, ${youtubeChannels.country})`,
        url: sql`excluded.url`,
        raw: sql`excluded.raw`,
        collectedAt: sql`excluded.collected_at`,
        updatedAt: collectedAt,
      },
    })
    .returning();
}

export async function upsertVideos(
  rows: CanonicalVideoInput[],
): Promise<YouTubeVideoRow[]> {
  if (rows.length === 0) return [];
  const seen = new Set<string>();
  const videoRows = rows.filter((video) => {
    if (seen.has(video.videoId)) return false;
    seen.add(video.videoId);
    return true;
  });
  const db = getDbClient();
  const collectedAt = now();
  return db
    .insert(youtubeVideos)
    .values(
      videoRows.map((video) => ({
        videoId: video.videoId,
        channelId: video.channelId || null,
        title: video.title ?? '',
        description: video.description ?? null,
        thumbnailUrl: thumbnailUrl(video),
        videoUrl: video.url ?? `https://www.youtube.com/watch?v=${video.videoId}`,
        publishedAt: timestamp(video.publishedAt),
        durationSec: video.durationSeconds ?? video.durationSec ?? null,
        isShort: resolveIsShort(video),
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
        isShort: sql`excluded.is_short`,
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

const HOT_VIDEO_UPSERT_CHUNK = 50;

function chunkHotVideoInputs<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

export async function upsertHotVideos(results: HotVideoInput[]): Promise<void> {
  if (results.length === 0) return;
  const db = getDbClient();
  const collectedAt = now();
  const collectedAtIso = collectedAt.toISOString();

  for (const batch of chunkHotVideoInputs(results, HOT_VIDEO_UPSERT_CHUNK)) {
    const valueRows = sql.join(
      batch.map(
        (result) => sql`(
          ${result.hotDate}::date,
          ${result.regionCode ?? 'KR'},
          ${result.categoryId ?? null},
          ${result.videoId},
          ${result.rank ?? result.chartRank ?? 0},
          ${result.source ?? 'youtube_trending'},
          ${collectedAtIso}::timestamptz
        )`,
      ),
      sql`, `,
    );

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
      values ${valueRows}
      on conflict (
        hot_date,
        region_code,
        coalesce(category_id, ''),
        video_id,
        source
      )
      do update set
        rank = excluded.rank,
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

function buildHotVideoFilterClauses(input: {
  regionCode?: string;
  date?: string | null;
  dateEnd?: string | null;
  categoryId?: string | null;
  source?: string | string[] | null;
  q?: string | null;
  isShort?: boolean | null;
  minPerformanceGrade?: HotVideoScoreGrade | null;
  minContributionGrade?: HotVideoScoreGrade | null;
  scoreLogic?: HotVideoScoreLogic;
  minSubscribers?: number;
  maxSubscribers?: number;
  minViews?: number;
  maxViews?: number;
  publishedAfter?: string;
  publishedBefore?: string;
  performanceGrades?: HotVideoScoreGrade[];
  contributionGrades?: HotVideoScoreGrade[];
}): SQL[] {
  const clauses: SQL[] = [
    eq(youtubeHotVideos.regionCode, input.regionCode ?? 'KR'),
  ];

  if (input.date) {
    if (input.dateEnd) {
      clauses.push(gte(youtubeHotVideos.hotDate, input.date));
      clauses.push(lte(youtubeHotVideos.hotDate, input.dateEnd));
    } else {
      clauses.push(eq(youtubeHotVideos.hotDate, input.date));
    }
  }

  if (input.categoryId !== undefined) {
    clauses.push(
      input.categoryId === null
        ? sql`${youtubeHotVideos.categoryId} is null`
        : eq(youtubeHotVideos.categoryId, input.categoryId),
    );
  }

  if (input.source != null) {
    const sources = Array.isArray(input.source) ? input.source : [input.source];
    const filtered = sources.filter((value) => value.length > 0);
    if (filtered.length === 1) {
      clauses.push(eq(youtubeHotVideos.source, filtered[0]!));
    } else if (filtered.length > 1) {
      clauses.push(inArray(youtubeHotVideos.source, filtered));
    }
  }

  const searchTerm = input.q?.trim();
  if (searchTerm) {
    const pattern = `%${searchTerm.replace(/[%_\\]/g, '\\$&')}%`;
    const searchClause = or(
      ilike(youtubeVideos.title, pattern),
      ilike(youtubeChannels.title, pattern),
    );
    if (searchClause) clauses.push(searchClause);
  }

  if (input.isShort === true) {
    clauses.push(eq(youtubeVideos.isShort, true));
  } else if (input.isShort === false) {
    clauses.push(
      sql`(${youtubeVideos.isShort} is null or ${youtubeVideos.isShort} = false)`,
    );
  }

  if (input.minSubscribers != null) {
    clauses.push(gte(youtubeChannels.subscriberCount, input.minSubscribers));
  }
  if (input.maxSubscribers != null) {
    clauses.push(lte(youtubeChannels.subscriberCount, input.maxSubscribers));
  }
  if (input.minViews != null) {
    clauses.push(gte(youtubeVideos.viewCount, input.minViews));
  }
  if (input.maxViews != null) {
    clauses.push(lte(youtubeVideos.viewCount, input.maxViews));
  }
  if (input.publishedAfter) {
    clauses.push(gte(youtubeVideos.publishedAt, timestamp(input.publishedAfter)!));
  }
  if (input.publishedBefore) {
    clauses.push(
      lte(
        youtubeVideos.publishedAt,
        timestamp(`${input.publishedBefore}T23:59:59.999Z`)!,
      ),
    );
  }

  const scoreClause = buildScoreFilterClause(input);
  if (scoreClause) clauses.push(scoreClause);

  return clauses;
}

function buildHotVideoOrderBy(
  sort: HotVideoSortField | undefined,
  order: HotVideoSortOrder = 'desc',
) {
  const tieBreak = [desc(youtubeHotVideos.hotDate), asc(youtubeHotVideos.rank)];

  if (!sort) {
    return tieBreak;
  }

  const direction = order === 'asc' ? 'asc' : 'desc';
  const nulls = order === 'asc' ? 'nulls first' : 'nulls last';

  let primary: SQL;
  switch (sort) {
    case 'views':
      primary = sql`${youtubeVideos.viewCount}`;
      break;
    case 'subscribers':
      primary = sql`${youtubeChannels.subscriberCount}`;
      break;
    case 'videoCount':
      primary = sql`${youtubeChannels.videoCount}`;
      break;
    case 'duration':
      primary = sql`${youtubeVideos.durationSec}`;
      break;
    case 'publishedAt':
      primary = sql`${youtubeVideos.publishedAt}`;
      break;
    case 'contribution':
      primary = sql`case
        when ${youtubeChannels.averageViewCount} > 0
        then ${youtubeVideos.viewCount}::float / ${youtubeChannels.averageViewCount}
        else null
      end`;
      break;
    case 'performance':
      primary = sql`case
        when ${youtubeChannels.subscriberCount} > 0
        then ${youtubeVideos.viewCount}::float / ${youtubeChannels.subscriberCount}
        else null
      end`;
      break;
    default:
      return tieBreak;
  }

  return [
    sql`${primary} ${sql.raw(direction)} ${sql.raw(nulls)}`,
    ...tieBreak,
  ];
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
  const clauses = buildHotVideoFilterClauses({
    regionCode: input.regionCode,
    date: input.date,
    dateEnd: input.dateEnd,
    categoryId: input.categoryId,
  });

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

export async function searchHotVideos(
  input: SearchHotVideosInput,
): Promise<SearchHotVideosResult> {
  const db = getDbClient();
  const limit = Math.min(Math.max(input.limit ?? 24, 1), 100);
  const offset = Math.max(input.offset ?? 0, 0);
  const clauses = buildHotVideoFilterClauses(input);

  const baseQuery = db
    .select({
      hotVideo: youtubeHotVideos,
      video: youtubeVideos,
      channel: youtubeChannels,
    })
    .from(youtubeHotVideos)
    .leftJoin(youtubeVideos, eq(youtubeHotVideos.videoId, youtubeVideos.videoId))
    .leftJoin(
      youtubeChannels,
      eq(youtubeVideos.channelId, youtubeChannels.channelId),
    )
    .where(and(...clauses));

  const [countRow] = await db
    .select({ total: count() })
    .from(youtubeHotVideos)
    .leftJoin(youtubeVideos, eq(youtubeHotVideos.videoId, youtubeVideos.videoId))
    .leftJoin(
      youtubeChannels,
      eq(youtubeVideos.channelId, youtubeChannels.channelId),
    )
    .where(and(...clauses));

  const total = Number(countRow?.total ?? 0);
  const orderBy = buildHotVideoOrderBy(input.sort, input.order ?? 'desc');

  const rows = await baseQuery
    .orderBy(...orderBy)
    .limit(limit)
    .offset(offset);

  return {
    rows,
    total,
    hasMore: offset + rows.length < total,
  };
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

export async function listAllYouTubeVideoIds(limit = 5000): Promise<string[]> {
  const db = getDbClient();
  const rows = await db
    .select({ videoId: youtubeVideos.videoId })
    .from(youtubeVideos)
    .limit(Math.min(Math.max(limit, 1), 10000));
  return rows.map((row) => row.videoId);
}

export async function listAllYouTubeChannelIds(limit = 2000): Promise<string[]> {
  const db = getDbClient();
  const rows = await db
    .select({ channelId: youtubeChannels.channelId })
    .from(youtubeChannels)
    .limit(Math.min(Math.max(limit, 1), 5000));
  return rows.map((row) => row.channelId);
}

function parseKeywordHarvestQuery(query: unknown): {
  keyword: string;
  regionCode: string;
  searchOrder: string;
  limit: number;
  forceRefresh: boolean;
} {
  const fallback = {
    keyword: '',
    regionCode: 'KR',
    searchOrder: 'relevance',
    limit: 50,
    forceRefresh: false,
  };
  if (query == null || typeof query !== 'object') return fallback;
  const record = query as Record<string, unknown>;
  return {
    keyword: typeof record.keyword === 'string' ? record.keyword : fallback.keyword,
    regionCode:
      typeof record.regionCode === 'string' ? record.regionCode : fallback.regionCode,
    searchOrder:
      typeof record.order === 'string' ? record.order : fallback.searchOrder,
    limit:
      typeof record.limit === 'number' && Number.isFinite(record.limit)
        ? record.limit
        : fallback.limit,
    forceRefresh: record.forceRefresh === true,
  };
}

function kstDayRange(ymd: string): { start: Date; end: Date } {
  const start = new Date(`${ymd}T00:00:00+09:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export async function listKeywordHarvestSessionsByDate(input: {
  date: string;
  regionCode?: string;
}): Promise<KeywordHarvestSessionSummary[]> {
  const db = getDbClient();
  const { start, end } = kstDayRange(input.date);
  const rows = await db
    .select()
    .from(youtubeHarvestSessions)
    .where(
      and(
        eq(youtubeHarvestSessions.type, 'keyword_search'),
        gte(youtubeHarvestSessions.startedAt, start),
        lte(youtubeHarvestSessions.startedAt, end),
      ),
    )
    .orderBy(desc(youtubeHarvestSessions.startedAt));

  return rows
    .map((row) => {
      const parsed = parseKeywordHarvestQuery(row.query);
      if (input.regionCode && parsed.regionCode !== input.regionCode) {
        return null;
      }
      return {
        id: row.id,
        keyword: parsed.keyword,
        regionCode: parsed.regionCode,
        searchOrder: parsed.searchOrder,
        limit: parsed.limit,
        forceRefresh: parsed.forceRefresh,
        status: row.status as HarvestStatus,
        resultCount: row.resultCount,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
      };
    })
    .filter((row): row is KeywordHarvestSessionSummary => row != null);
}

export async function listKeywordHarvestResults(input: {
  harvestId: string;
  hotDate?: string | null;
  regionCode?: string;
}): Promise<KeywordHarvestResultRow[]> {
  const db = getDbClient();
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
    .where(eq(youtubeKeywordVideoResults.harvestId, input.harvestId))
    .orderBy(asc(youtubeKeywordVideoResults.rank));

  const promotedVideoIds = new Set<string>();
  if (input.hotDate) {
    const promoted = await db
      .select({ videoId: youtubeHotVideos.videoId })
      .from(youtubeHotVideos)
      .where(
        and(
          eq(youtubeHotVideos.hotDate, input.hotDate),
          eq(youtubeHotVideos.source, HOT_VIDEO_SOURCE_KEYWORD_PROMOTED),
          eq(youtubeHotVideos.regionCode, input.regionCode ?? 'KR'),
        ),
      );
    for (const row of promoted) {
      promotedVideoIds.add(row.videoId);
    }
  }

  return rows.map((row) => {
    const performanceRatio =
      row.video.viewCount != null &&
      row.channel?.subscriberCount != null &&
      row.channel.subscriberCount > 0
        ? row.video.viewCount / row.channel.subscriberCount
        : null;
    const contributionRatio =
      row.video.viewCount != null &&
      row.channel?.averageViewCount != null &&
      row.channel.averageViewCount > 0
        ? row.video.viewCount / row.channel.averageViewCount
        : null;

    return {
      result: row.result,
      video: row.video,
      channel: row.channel,
      performanceRatio,
      contributionRatio,
      promoted: promotedVideoIds.has(row.video.videoId),
    };
  });
}

export async function queryPromotableKeywordResults(input: {
  collectedDate: string;
  regionCode?: string;
}): Promise<PromotableKeywordResultRow[]> {
  const db = getDbClient();
  const { start, end } = kstDayRange(input.collectedDate);
  const regionCode = input.regionCode ?? 'KR';
  const goodThreshold = minGradeToRatioThreshold(KEYWORD_PROMOTION_MIN_SCORE_GRADE) ?? 10;

  const result = (await db.execute(sql`
    with scored as (
      select
        kr.video_id,
        kr.region_code,
        v.category_id,
        kr.keyword,
        kr.rank as keyword_rank,
        case
          when c.subscriber_count > 0
          then v.view_count::float / c.subscriber_count
          else null
        end as performance_ratio,
        case
          when c.average_view_count > 0
          then v.view_count::float / c.average_view_count
          else null
        end as contribution_ratio
      from public.youtube_keyword_video_results kr
      inner join public.youtube_videos v on kr.video_id = v.video_id
      left join public.youtube_channels c on v.channel_id = c.channel_id
      where kr.collected_at >= ${start.toISOString()}::timestamptz
        and kr.collected_at < ${end.toISOString()}::timestamptz
        and kr.region_code = ${regionCode}
    ),
    deduped as (
      select distinct on (video_id)
        video_id,
        region_code,
        category_id,
        keyword,
        keyword_rank,
        performance_ratio,
        contribution_ratio
      from scored
      where performance_ratio >= ${goodThreshold}
        and contribution_ratio >= ${goodThreshold}
      order by
        video_id,
        contribution_ratio desc,
        performance_ratio desc,
        keyword_rank asc
    )
    select *
    from deduped
    order by
      contribution_ratio desc,
      performance_ratio desc,
      keyword_rank asc
  `)) as unknown as Array<{
    video_id: string;
    region_code: string;
    category_id: string | null;
    keyword: string;
    keyword_rank: number;
    performance_ratio: number;
    contribution_ratio: number;
  }>;

  return result.map((row) => ({
    videoId: row.video_id,
    regionCode: row.region_code,
    categoryId: row.category_id,
    keyword: row.keyword,
    keywordRank: row.keyword_rank,
    performanceRatio: row.performance_ratio,
    contributionRatio: row.contribution_ratio,
  }));
}
