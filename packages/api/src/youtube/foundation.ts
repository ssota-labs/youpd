import { z } from 'zod';
import {
  fetchHotChart,
  getChannelAllVideos,
  getChannelOverview,
  getVideoComments,
  getVideoDetail,
  searchKeyword,
  snapshotChannelsNow,
  snapshotNow,
} from '../mcp/tools/index';
import {
  completeHarvestSession,
  createHarvestSession,
  getFreshKeywordCache,
  getChannelSummary,
  getKeywordSummary,
  queryChannelMetricSnapshots,
  queryHotVideos,
  queryVideoMetricSnapshots,
  updateChannelAverageViewCount,
  upsertKeywordCache,
  upsertChannelMetricSnapshots,
  upsertChannels,
  upsertComments,
  upsertHotVideos,
  upsertKeywordResults,
  upsertVideoMetricSnapshots,
  upsertVideos,
  type CanonicalVideoInput,
  type HarvestStatus,
} from '@youpd/supabase/repositories/youtube';
import type {
  ChannelSummary,
  CommentSummary,
  VideoSummary,
} from '@youpd/youtube';
import type {
  YouTubeChannelRow,
  YouTubeVideoMetricSnapshotRow,
  YouTubeVideoRow,
} from '@youpd/db';

export type YouTubeFoundationWarning = {
  code: string;
  message: string;
  target?: Record<string, unknown>;
};

export type YouTubeFoundationResponse<T> = {
  data: T;
  warnings: YouTubeFoundationWarning[];
  nextCursor: string | null;
  harvest: {
    id: string | null;
    status: HarvestStatus;
    resultCount: number;
  } | null;
  collectedAt: string;
};

const PersistSchema = z.boolean().default(true);
const RegionCodeSchema = z.string().length(2).default('KR');

export const SearchYouTubeVideosInputSchema = z
  .object({
    keyword: z.string().min(1).max(200),
    limit: z.number().int().min(1).max(50).default(50),
    regionCode: RegionCodeSchema,
    order: z
      .enum(['date', 'rating', 'relevance', 'title', 'videoCount', 'viewCount'])
      .default('relevance'),
    persist: PersistSchema,
    includeScore: z.boolean().default(true),
    forceRefresh: z.boolean().default(false),
    cacheTtlDays: z.number().int().min(1).max(30).default(7),
  })
  .strict();
export type SearchYouTubeVideosInput = z.infer<
  typeof SearchYouTubeVideosInputSchema
>;

export const GetYouTubeVideoInputSchema = z
  .object({
    videoId: z.string().min(1).max(50),
    persist: PersistSchema,
    includeChannel: z.boolean().default(true),
    includeComments: z.boolean().default(false),
    commentsTopN: z.number().int().min(0).max(100).default(50),
    includeScore: z.boolean().default(true),
  })
  .strict();
export type GetYouTubeVideoInput = z.infer<typeof GetYouTubeVideoInputSchema>;

export const BatchYouTubeVideosInputSchema = z
  .object({
    videoIds: z.array(z.string().min(1).max(50)).min(1).max(50),
    persist: PersistSchema,
    includeChannel: z.boolean().default(true),
    includeScore: z.boolean().default(true),
  })
  .strict();
export type BatchYouTubeVideosInput = z.infer<
  typeof BatchYouTubeVideosInputSchema
>;

export const GetYouTubeChannelInputSchema = z
  .object({
    channelId: z.string().min(1).max(50),
    persist: PersistSchema,
    refreshAverage: z.boolean().default(false),
    averageVideoLimit: z.number().int().min(1).max(50).default(30),
  })
  .strict();
export type GetYouTubeChannelInput = z.infer<
  typeof GetYouTubeChannelInputSchema
>;

export const ListYouTubeChannelVideosInputSchema = z
  .object({
    channelId: z.string().min(1).max(50),
    limit: z.number().int().min(1).max(500).default(50),
    persist: PersistSchema,
    updateChannelAverage: z.boolean().default(true),
  })
  .strict();
export type ListYouTubeChannelVideosInput = z.infer<
  typeof ListYouTubeChannelVideosInputSchema
>;

export const ListYouTubeVideoCommentsInputSchema = z
  .object({
    videoId: z.string().min(1).max(50),
    limit: z.number().int().min(1).max(100).default(100),
    persist: PersistSchema,
  })
  .strict();
export type ListYouTubeVideoCommentsInput = z.infer<
  typeof ListYouTubeVideoCommentsInputSchema
>;

export const FetchTrendingYouTubeVideosInputSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    regionCode: RegionCodeSchema,
    categoryId: z.string().nullable().optional(),
    limit: z.number().int().min(1).max(50).default(50),
    persist: PersistSchema,
  })
  .strict();
export type FetchTrendingYouTubeVideosInput = z.infer<
  typeof FetchTrendingYouTubeVideosInputSchema
>;

export const CaptureYouTubeMetricSnapshotsInputSchema = z
  .object({
    snapshotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    videoIds: z.array(z.string().min(1).max(50)).max(500).default([]),
    channelIds: z.array(z.string().min(1).max(50)).max(500).default([]),
    source: z.string().default('scheduled_snapshot'),
    persist: PersistSchema,
  })
  .strict();
export type CaptureYouTubeMetricSnapshotsInput = z.infer<
  typeof CaptureYouTubeMetricSnapshotsInputSchema
>;

export const QueryHotVideosInputSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    regionCode: RegionCodeSchema,
    categoryId: z.string().nullable().optional(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .strict();

export const KeywordSummaryInputSchema = z
  .object({
    keywords: z.array(z.string().min(1).max(200)).min(1).max(20),
    regionCode: RegionCodeSchema,
    lookbackDays: z.number().int().min(1).max(365).default(30),
    limit: z.number().int().min(1).max(500).default(300),
  })
  .strict();

export const ChannelSummaryInputSchema = z
  .object({
    channelId: z.string().min(1).max(50),
    recentVideoLimit: z.number().int().min(1).max(100).default(30),
  })
  .strict();

export const VideoSnapshotsQueryInputSchema = z
  .object({
    videoIds: z.array(z.string().min(1).max(50)).min(1).max(200),
    dateStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    dateEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  })
  .strict();

export const ChannelSnapshotsQueryInputSchema = z
  .object({
    channelIds: z.array(z.string().min(1).max(50)).min(1).max(200),
    dateStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    dateEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  })
  .strict();

function collectedAt(): string {
  return new Date().toISOString();
}

function todayYmd(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.SNAPSHOT_DEFAULT_TIME_ZONE || 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function ok<T>(
  data: T,
  opts: {
    warnings?: YouTubeFoundationWarning[];
    nextCursor?: string | null;
    harvest?: YouTubeFoundationResponse<T>['harvest'];
  } = {},
): YouTubeFoundationResponse<T> {
  return {
    data,
    warnings: opts.warnings ?? [],
    nextCursor: opts.nextCursor ?? null,
    harvest: opts.harvest ?? null,
    collectedAt: collectedAt(),
  };
}

async function persistWithHarvest(
  type: string,
  query: unknown,
  resultCount: number,
  persist: (harvestId: string) => Promise<void>,
): Promise<YouTubeFoundationResponse<unknown>['harvest']> {
  const session = await createHarvestSession({ type, query });
  try {
    await persist(session.id);
    await completeHarvestSession({
      id: session.id,
      status: 'success',
      resultCount,
    });
    return { id: session.id, status: 'success', resultCount };
  } catch (error) {
    await completeHarvestSession({
      id: session.id,
      status: 'failed',
      resultCount: 0,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

function disabledCommentsWarning(
  videoId: string,
  disabled: boolean,
): YouTubeFoundationWarning[] {
  return disabled
    ? [
        {
          code: 'COMMENT_DISABLED',
          message: 'Comments are disabled or unavailable for this video.',
          target: { videoId },
        },
      ]
    : [];
}

function grade(ratio: number | null): string {
  if (ratio == null || !Number.isFinite(ratio)) return 'Unknown';
  if (ratio < 0.1) return 'Worst';
  if (ratio < 1) return 'Bad';
  if (ratio < 10) return 'Normal';
  if (ratio < 100) return 'Good';
  return 'Great';
}

function scoreFor(video: VideoSummary | YouTubeVideoRow, channel?: ChannelSummary | YouTubeChannelRow | null) {
  const views = 'views' in video ? video.views : video.viewCount;
  const subscribers = channel && 'subscriberCount' in channel ? channel.subscriberCount : null;
  const average = channel && 'averageViewCount' in channel ? channel.averageViewCount : null;
  const duration =
    'durationSeconds' in video ? video.durationSeconds : video.durationSec;
  const performanceRatio =
    views != null && subscribers != null && subscribers > 0
      ? views / subscribers
      : null;
  const contributionRatio =
    views != null && average != null && average > 0 ? views / average : null;
  const referenceDuration = Number(process.env.LENGTH_REFERENCE_DURATION_SEC ?? 600);
  const minWeight = Number(process.env.LENGTH_WEIGHT_MIN ?? 0.5);
  const maxWeight = Number(process.env.LENGTH_WEIGHT_MAX ?? 2);
  const lengthWeight =
    duration && duration > 0
      ? Math.min(
          maxWeight,
          Math.max(minWeight, Math.log1p(referenceDuration) / Math.log1p(duration)),
        )
      : 1;
  const base =
    performanceRatio != null && contributionRatio != null
      ? Math.sqrt(performanceRatio * contributionRatio)
      : null;
  return {
    performance: { ratio: performanceRatio, grade: grade(performanceRatio) },
    contribution: { ratio: contributionRatio, grade: grade(contributionRatio) },
    lengthAdjustment: {
      durationSec: duration ?? null,
      referenceDurationSec: referenceDuration,
      weight: lengthWeight,
      adjustedScore: base == null ? null : base * lengthWeight,
    },
  };
}

function videoWithScore(video: VideoSummary, channel?: ChannelSummary | null) {
  return { ...video, ...scoreFor(video, channel ?? null) };
}

function dbVideoWithScore(video: YouTubeVideoRow, channel?: YouTubeChannelRow | null) {
  return { ...video, ...scoreFor(video, channel ?? null) };
}

function toApiVideo(video: YouTubeVideoRow, channel?: YouTubeChannelRow | null) {
  return {
    videoId: video.videoId,
    title: video.title,
    description: video.description ?? '',
    channelId: video.channelId ?? '',
    channelTitle: channel?.title ?? '',
    publishedAt: video.publishedAt?.toISOString() ?? '',
    thumbnails: {},
    thumbnailUrl: video.thumbnailUrl ?? null,
    durationSeconds: video.durationSec,
    views: video.viewCount,
    likes: video.likeCount,
    comments: video.commentCount,
    categoryId: video.categoryId,
    tags: Array.isArray(video.tags) ? video.tags : [],
    defaultAudioLanguage: video.defaultAudioLanguage,
    url: video.videoUrl ?? `https://www.youtube.com/watch?v=${video.videoId}`,
  };
}

function toApiChannel(channel: YouTubeChannelRow) {
  return {
    channelId: channel.channelId,
    title: channel.title,
    description: channel.description ?? '',
    publishedAt: channel.publishedAt?.toISOString() ?? '',
    thumbnailUrl: channel.thumbnailUrl ?? null,
    subscriberCount: channel.subscriberCount,
    videoCount: channel.videoCount,
    viewCount: channel.viewCount,
    hiddenSubscriberCount: channel.hiddenSubscriberCount,
    averageViewCount: channel.averageViewCount,
    uploadsPlaylistId: channel.uploadsPlaylistId,
    country: channel.country,
    url: channel.url,
  };
}

export async function searchYouTubeVideos(input: SearchYouTubeVideosInput) {
  if (input.persist && !input.forceRefresh) {
    const cached = await getFreshKeywordCache({
      keyword: input.keyword,
      regionCode: input.regionCode,
      searchOrder: input.order,
      limit: input.limit,
    });
    if (cached) {
      const channelById = new Map(
        cached.results
          .map((row) => row.channel)
          .filter((channel): channel is YouTubeChannelRow => channel != null)
          .map((channel) => [channel.channelId, channel]),
      );
      const videos = cached.results.map(({ video, channel }) => {
        const apiVideo = toApiVideo(video, channel);
        return input.includeScore
          ? { ...apiVideo, ...scoreFor(apiVideo, channel ?? null) }
          : apiVideo;
      });
      const channels = Array.from(channelById.values()).map(toApiChannel);
      return ok({
        keyword: input.keyword,
        videos,
        channels,
        unitsConsumed: 0,
        quotaSessionId: null,
        cache: {
          hit: true,
          keywordId: cached.keyword.id,
          harvestId: cached.keyword.lastHarvestId,
          collectedAt: cached.keyword.lastCollectedAt?.toISOString() ?? null,
          expiresAt: cached.keyword.cacheExpiresAt?.toISOString() ?? null,
        },
      });
    }
  }

  const raw = await searchKeyword({
    keyword: input.keyword,
    max_results: input.limit,
    region_code: input.regionCode,
    order: input.order,
  });
  const channelById = new Map(raw.channels.map((channel) => [channel.channelId, channel]));
  const videos = raw.videos.map((video) =>
    input.includeScore
      ? videoWithScore(video, channelById.get(video.channelId) ?? null)
      : video,
  );
  const harvest = input.persist
    ? await persistWithHarvest(
        'keyword_search',
        input,
        raw.videos.length,
        async (harvestId) => {
          await upsertChannels(raw.channels);
          await upsertVideos(raw.videos);
          await upsertKeywordResults(
            raw.videos.map((video, index) => ({
              harvestId,
              keyword: input.keyword,
              videoId: video.videoId,
              rank: index + 1,
              searchOrder: input.order,
              regionCode: input.regionCode,
            })),
          );
          await upsertKeywordCache({
            keyword: input.keyword,
            regionCode: input.regionCode,
            searchOrder: input.order,
            harvestId,
            resultCount: raw.videos.length,
            ttlDays: input.cacheTtlDays,
          });
        },
      )
    : null;
  return ok(
    {
      keyword: input.keyword,
      videos,
      channels: raw.channels,
      unitsConsumed: raw.units_consumed,
      quotaSessionId: raw.quota_session_id ?? null,
      cache: {
        hit: false,
        expiresAt:
          input.persist && harvest
            ? new Date(
                Date.now() + input.cacheTtlDays * 24 * 60 * 60 * 1000,
              ).toISOString()
            : null,
      },
    },
    { harvest },
  );
}

export async function getYouTubeVideo(input: GetYouTubeVideoInput) {
  const raw = await getVideoDetail({
    video_id: input.videoId,
    include_comments: input.includeComments,
    comments_top_n: input.commentsTopN,
  });
  const harvest =
    input.persist && raw.video
      ? await persistWithHarvest('video_detail', input, raw.video ? 1 : 0, async () => {
          if (raw.channel) await upsertChannels([raw.channel]);
          if (raw.video) await upsertVideos([raw.video]);
          if (raw.top_comments.length > 0) await upsertComments(raw.top_comments);
        })
      : null;
  return ok(
    {
      video:
        raw.video && input.includeScore
          ? videoWithScore(raw.video, raw.channel)
          : raw.video,
      channel: input.includeChannel ? raw.channel : null,
      comments: raw.top_comments,
      commentsDisabled: raw.comments_disabled,
      unitsConsumed: raw.units_consumed,
      quotaSessionId: raw.quota_session_id ?? null,
    },
    { harvest, warnings: disabledCommentsWarning(input.videoId, raw.comments_disabled) },
  );
}

export async function batchYouTubeVideos(input: BatchYouTubeVideosInput) {
  const results = [];
  for (const videoId of input.videoIds) {
    const item = await getYouTubeVideo({
      videoId,
      persist: input.persist,
      includeChannel: input.includeChannel,
      includeComments: false,
      commentsTopN: 0,
      includeScore: input.includeScore,
    });
    results.push(item.data);
  }
  return ok({ videos: results });
}

export async function getYouTubeChannel(input: GetYouTubeChannelInput) {
  const raw = await getChannelOverview({
    channel_id: input.channelId,
    top_n: input.averageVideoLimit,
  });
  const harvest =
    input.persist && raw.channel
      ? await persistWithHarvest('channel_detail', input, raw.channel ? 1 : 0, async () => {
          if (raw.channel) await upsertChannels([raw.channel]);
          if (raw.top_videos.length > 0) {
            await upsertVideos(raw.top_videos);
            if (input.refreshAverage) {
              await updateChannelAverageViewCount(input.channelId, raw.top_videos, {
                method: 'recent_n',
                n: raw.top_videos.length,
              });
            }
          }
        })
      : null;
  return ok(
    {
      channel: raw.channel,
      topVideos: raw.top_videos,
      unitsConsumed: raw.units_consumed,
      quotaSessionId: raw.quota_session_id ?? null,
    },
    { harvest },
  );
}

export async function listYouTubeChannelVideos(
  input: ListYouTubeChannelVideosInput,
) {
  const raw = await getChannelAllVideos({
    channel_id: input.channelId,
    max_videos: input.limit,
  });
  const harvest =
    input.persist && raw.channel
      ? await persistWithHarvest('channel_videos', input, raw.videos.length, async () => {
          if (raw.channel) await upsertChannels([raw.channel]);
          if (raw.videos.length > 0) await upsertVideos(raw.videos);
          if (input.updateChannelAverage && raw.videos.length > 0) {
            await updateChannelAverageViewCount(input.channelId, raw.videos, {
              method: 'recent_n',
              n: raw.videos.length,
            });
          }
        })
      : null;
  return ok(
    {
      channel: raw.channel,
      videos: raw.videos,
      pagesFetched: raw.pages_fetched,
      unitsConsumed: raw.units_consumed,
      quotaSessionId: raw.quota_session_id ?? null,
    },
    { harvest },
  );
}

export async function listYouTubeVideoComments(
  input: ListYouTubeVideoCommentsInput,
) {
  const raw = await getVideoComments({
    video_id: input.videoId,
    top_n: input.limit,
  });
  const warnings = disabledCommentsWarning(input.videoId, raw.comments_disabled);
  let harvest: YouTubeFoundationResponse<unknown>['harvest'] = null;
  if (input.persist && !raw.comments_disabled) {
    try {
      harvest = await persistCommentsWithWarning(input, raw.top_comments);
    } catch (error) {
      warnings.push({
        code: 'COMMENTS_PERSIST_FAILED',
        message: error instanceof Error ? error.message : String(error),
        target: { videoId: input.videoId },
      });
    }
  }
  return ok(
    {
      videoId: raw.video_id,
      comments: raw.top_comments,
      commentsDisabled: raw.comments_disabled,
      languageHint: raw.language_hint,
      unitsConsumed: raw.units_consumed,
      quotaSessionId: raw.quota_session_id ?? null,
    },
    { harvest, warnings },
  );
}

async function persistCommentsWithWarning(
  input: ListYouTubeVideoCommentsInput,
  comments: CommentSummary[],
): Promise<YouTubeFoundationResponse<unknown>['harvest']> {
  return persistWithHarvest('comments', input, comments.length, async () => {
    await upsertComments(comments);
  });
}

export async function fetchTrendingYouTubeVideos(
  input: FetchTrendingYouTubeVideosInput,
) {
  const raw = await fetchHotChart({
    region_code: input.regionCode,
    category_id: input.categoryId ?? undefined,
    limit: input.limit,
  });
  const hotDate = input.date ?? todayYmd();
  const harvest = input.persist
    ? await persistWithHarvest('trending', input, raw.videos.length, async () => {
        const channelsById = new Map<string, CanonicalVideoInput>();
        for (const video of raw.videos) {
          if (!channelsById.has(video.channelId)) channelsById.set(video.channelId, video);
        }
        await upsertChannels(
          Array.from(channelsById.values()).map((video) => ({
            channelId: video.channelId,
            title: video.channelTitle ?? video.channelId,
            url: `https://www.youtube.com/channel/${video.channelId}`,
          })),
        );
        await upsertVideos(raw.videos);
        await upsertHotVideos(
          raw.videos.map((video, index) => ({
            hotDate,
            regionCode: input.regionCode,
            categoryId: input.categoryId ?? null,
            videoId: video.videoId,
            rank: index + 1,
            source: 'youtube_trending',
          })),
        );
      })
    : null;
  return ok(
    {
      date: hotDate,
      regionCode: input.regionCode,
      categoryId: input.categoryId ?? null,
      videos: raw.videos,
      source: 'youtube_trending',
      unitsConsumed: raw.units_consumed,
      quotaSessionId: raw.quota_session_id ?? null,
    },
    { harvest },
  );
}

export async function captureYouTubeMetricSnapshots(
  input: CaptureYouTubeMetricSnapshotsInput,
) {
  const snapshotDate = input.snapshotDate ?? todayYmd();
  const videoOut =
    input.videoIds.length > 0
      ? await snapshotNow({ video_ids: input.videoIds })
      : null;
  const channelOut =
    input.channelIds.length > 0
      ? await snapshotChannelsNow({ channel_ids: input.channelIds })
      : null;
  const warnings: YouTubeFoundationWarning[] = [];
  let harvest: YouTubeFoundationResponse<unknown>['harvest'] = null;
  if (input.persist) {
    try {
      harvest = await persistWithHarvest(
        'metric_snapshots',
        input,
        (videoOut?.snapshots.length ?? 0) + (channelOut?.snapshots.length ?? 0),
        async () => {
          await upsertVideoMetricSnapshots(
            (videoOut?.snapshots ?? []).map((snapshot) => ({
              snapshotDate,
              videoId: snapshot.video_id,
              viewCount: snapshot.views,
              likeCount: snapshot.likes,
              commentCount: snapshot.comments,
              source: input.source,
            })),
          );
          await upsertChannelMetricSnapshots(
            (channelOut?.snapshots ?? []).map((snapshot) => ({
              snapshotDate,
              channelId: snapshot.channel_id,
              subscriberCount: snapshot.subscribers,
              viewCount: snapshot.view_count,
              videoCount: snapshot.video_count,
              source: input.source,
            })),
          );
        },
      );
    } catch (error) {
      warnings.push({
        code: 'SNAPSHOT_PERSIST_FAILED',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return ok(
    {
      snapshotDate,
      videoSnapshots: videoOut?.snapshots ?? [],
      channelSnapshots: channelOut?.snapshots ?? [],
      missingVideoIds: videoOut?.missing_video_ids ?? [],
      missingChannelIds: channelOut?.missing_channel_ids ?? [],
      quotaSessionIds: [
        videoOut?.quota_session_id,
        channelOut?.quota_session_id,
      ].filter((value): value is string => typeof value === 'string'),
      unitsConsumed:
        (videoOut?.units_consumed ?? 0) + (channelOut?.units_consumed ?? 0),
    },
    { harvest, warnings },
  );
}

export async function queryYouTubeHotVideos(
  input: z.infer<typeof QueryHotVideosInputSchema>,
) {
  const rows = await queryHotVideos(input);
  return ok({
    videos: rows.map((row) => ({
      hotVideo: row.hotVideo,
      video: row.video
        ? dbVideoWithScore(row.video, row.channel)
        : null,
      channel: row.channel,
    })),
  });
}

export async function summarizeKeywordMarket(
  input: z.infer<typeof KeywordSummaryInputSchema>,
) {
  const summaries = await Promise.all(
    input.keywords.map((keyword) =>
      getKeywordSummary({
        keyword,
        regionCode: input.regionCode,
        lookbackDays: input.lookbackDays,
        limit: input.limit,
      }),
    ),
  );
  return ok({ summaries });
}

export async function summarizeChannel(
  input: z.infer<typeof ChannelSummaryInputSchema>,
) {
  const summary = await getChannelSummary(input);
  return ok(summary);
}

function snapshotDeltas<T extends YouTubeVideoMetricSnapshotRow>(
  snapshots: T[],
): (T & { delta: number | null; growthRate: number | null })[] {
  const lastById = new Map<string, T>();
  return snapshots.map((snapshot) => {
    const previous = lastById.get(snapshot.videoId);
    lastById.set(snapshot.videoId, snapshot);
    const delta =
      previous?.viewCount != null && snapshot.viewCount != null
        ? snapshot.viewCount - previous.viewCount
        : null;
    return {
      ...snapshot,
      delta,
      growthRate:
        delta != null && previous?.viewCount != null && previous.viewCount > 0
          ? delta / previous.viewCount
          : null,
    };
  });
}

export async function queryVideoMetricSnapshotSeries(
  input: z.infer<typeof VideoSnapshotsQueryInputSchema>,
) {
  const snapshots = await queryVideoMetricSnapshots({
    ids: input.videoIds,
    dateStart: input.dateStart,
    dateEnd: input.dateEnd,
  });
  return ok({ snapshots: snapshotDeltas(snapshots) });
}

export async function queryChannelMetricSnapshotSeries(
  input: z.infer<typeof ChannelSnapshotsQueryInputSchema>,
) {
  const snapshots = await queryChannelMetricSnapshots({
    ids: input.channelIds,
    dateStart: input.dateStart,
    dateEnd: input.dateEnd,
  });
  return ok({ snapshots });
}
