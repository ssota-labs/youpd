import { z } from 'zod';
import {
  getCommentsByVideoIds,
  getHotVideos,
  getLatestKeywordVideos,
  getVideosByIds,
  type VideoWithChannel,
} from '@youpd/supabase/repositories/youtube';
import { scoreVideo, type ScoreBundle, type ScoreGrade } from '../../query/scoring';

const ScoreGradeSchema = z.enum([
  'Unknown',
  'Worst',
  'Bad',
  'Normal',
  'Good',
  'Great',
]);

export const KeywordSummaryInputSchema = z
  .object({
    keywords: z.array(z.string().min(1).max(200)).min(1).max(20),
    limit: z.number().int().min(1).max(500).default(300),
  })
  .strict();
export type KeywordSummaryInput = z.infer<typeof KeywordSummaryInputSchema>;

export const QueryKeywordSearchInputSchema = z
  .object({
    keywords: z.array(z.string().min(1).max(200)).min(1).max(20),
    limit: z.number().int().min(1).max(100).default(50),
    minPerformanceGrade: ScoreGradeSchema.default('Normal'),
    minContributionGrade: ScoreGradeSchema.default('Normal'),
    sort: z
      .enum(['length_adjusted_score_desc', 'view_count_desc', 'published_at_desc', 'position_asc'])
      .default('length_adjusted_score_desc'),
  })
  .strict();
export type QueryKeywordSearchInput = z.infer<typeof QueryKeywordSearchInputSchema>;

export const QueryHotVideosInputSchema = z
  .object({
    date: z.string().optional().nullable(),
    dateEnd: z.string().optional().nullable(),
    limit: z.number().int().min(1).max(100).default(50),
    minPerformanceGrade: ScoreGradeSchema.default('Good'),
    minContributionGrade: ScoreGradeSchema.default('Good'),
  })
  .strict();
export type QueryHotVideosInput = z.infer<typeof QueryHotVideosInputSchema>;

export const QueryCommentsInputSchema = z
  .object({
    videoIds: z.array(z.string().min(1).max(200)).min(1).max(50),
    minLikeCount: z.number().int().min(0).default(0),
    limit: z.number().int().min(1).max(100).default(30),
  })
  .strict();
export type QueryCommentsInput = z.infer<typeof QueryCommentsInputSchema>;

export const VideoCandidateLookupInputSchema = z
  .object({
    videoIds: z.array(z.string().min(1).max(200)).min(1).max(50),
  })
  .strict();
export type VideoCandidateLookupInput = z.infer<typeof VideoCandidateLookupInputSchema>;

export type QueryVideoResult = {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  videoUrl: string;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  publishedAt: string | null;
  durationSec: number | null;
  channel: {
    channelId: string;
    title: string;
    subscriberCount: number | null;
    averageViewCount: number | null;
  };
  performance: ScoreBundle['performance'];
  contribution: ScoreBundle['contribution'];
  lengthAdjustment: ScoreBundle['lengthAdjustment'];
  highPerforming: boolean;
  position?: number;
};

export type KeywordSummary = {
  videoCount: number;
  totalViewCount: number;
  topVideoViewCount: number | null;
  top10ViewCount: number;
  averageViewCount: number | null;
  medianViewCount: number | null;
  highPerformingVideoCount: number;
  averageLengthAdjustedScore: number | null;
  collectedAt: string | null;
};

export type KeywordSummaryOutput = {
  keywords: {
    keyword: string;
    summary: KeywordSummary;
    scoreDistribution: {
      performance: Record<ScoreGrade, number>;
      contribution: Record<ScoreGrade, number>;
      highPerforming: { GoodOrGreatBoth: number };
    };
  }[];
};

export type QueryKeywordSearchOutput = {
  keywords: {
    keyword: string;
    summary: KeywordSummary;
    videos: QueryVideoResult[];
  }[];
};

export type QueryHotVideosOutput = {
  date: string | null;
  dateEnd: string | null;
  videos: (QueryVideoResult & {
    hotVideoId: string;
    hotDate: string;
    source: string;
    chartRank: number | null;
  })[];
};

export type QueryCommentsOutput = {
  comments: {
    commentId: string;
    videoId: string;
    text: string;
    likeCount: number;
    publishedAt: string | null;
  }[];
};

export type VideoCandidateLookupOutput = {
  videos: QueryVideoResult[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function pickThumbnailUrl(thumbnails: unknown): string | null {
  if (!isRecord(thumbnails)) return null;
  for (const key of ['maxres', 'standard', 'high', 'medium', 'default']) {
    const value = thumbnails[key];
    if (isRecord(value) && typeof value.url === 'string') return value.url;
  }
  return null;
}

function isoOrNull(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

const gradeRank: Record<ScoreGrade, number> = {
  Unknown: 0,
  Worst: 1,
  Bad: 2,
  Normal: 3,
  Good: 4,
  Great: 5,
};

function gradeMeets(grade: ScoreGrade, min: ScoreGrade): boolean {
  return gradeRank[grade] >= gradeRank[min];
}

function toQueryVideo(row: VideoWithChannel): QueryVideoResult {
  const channelAverageViewCount =
    row.channel.viewCount != null &&
    row.channel.videoCount != null &&
    row.channel.videoCount > 0
      ? Math.floor(row.channel.viewCount / row.channel.videoCount)
      : null;
  const score = scoreVideo({
    viewCount: row.video.views,
    subscriberCount: row.channel.subscriberCount,
    averageViewCount: channelAverageViewCount,
    durationSec: row.video.durationSec,
  });

  return {
    videoId: row.video.videoId,
    title: row.video.title ?? '',
    thumbnailUrl: null,
    videoUrl: row.video.url ?? '',
    viewCount: row.video.views,
    likeCount: row.video.likes,
    commentCount: row.video.comments,
    publishedAt: isoOrNull(row.video.publishedAt),
    durationSec: row.video.durationSec,
    channel: {
      channelId: row.channel.channelId,
      title: row.channel.title ?? '',
      subscriberCount: row.channel.subscriberCount,
      averageViewCount: channelAverageViewCount,
    },
    performance: score.performance,
    contribution: score.contribution,
    lengthAdjustment: score.lengthAdjustment,
    highPerforming: score.highPerforming,
    position: row.position,
  };
}

function emptyDistribution(): Record<ScoreGrade, number> {
  return {
    Unknown: 0,
    Worst: 0,
    Bad: 0,
    Normal: 0,
    Good: 0,
    Great: 0,
  };
}

function summarize(videos: QueryVideoResult[]): {
  summary: KeywordSummary;
  scoreDistribution: KeywordSummaryOutput['keywords'][number]['scoreDistribution'];
} {
  const views = videos
    .map((video) => video.viewCount)
    .filter((view): view is number => view != null)
    .sort((a, b) => a - b);
  const totalViewCount = views.reduce((sum, view) => sum + view, 0);
  const adjustedScores = videos
    .map((video) => video.lengthAdjustment.adjustedScore)
    .filter((score): score is number => score != null);
  const performance = emptyDistribution();
  const contribution = emptyDistribution();
  for (const video of videos) {
    performance[video.performance.grade] += 1;
    contribution[video.contribution.grade] += 1;
  }

  return {
    summary: {
      videoCount: videos.length,
      totalViewCount,
      topVideoViewCount: views.length > 0 ? views[views.length - 1]! : null,
      top10ViewCount: [...views]
        .sort((a, b) => b - a)
        .slice(0, 10)
        .reduce((sum, view) => sum + view, 0),
      averageViewCount: views.length > 0 ? Math.round(totalViewCount / views.length) : null,
      medianViewCount:
        views.length > 0 ? views[Math.floor((views.length - 1) / 2)]! : null,
      highPerformingVideoCount: videos.filter((video) => video.highPerforming).length,
      averageLengthAdjustedScore:
        adjustedScores.length > 0
          ? adjustedScores.reduce((sum, score) => sum + score, 0) / adjustedScores.length
          : null,
      collectedAt: null,
    },
    scoreDistribution: {
      performance,
      contribution,
      highPerforming: {
        GoodOrGreatBoth: videos.filter((video) => video.highPerforming).length,
      },
    },
  };
}

function filterByGrades(
  videos: QueryVideoResult[],
  minPerformanceGrade: ScoreGrade,
  minContributionGrade: ScoreGrade,
): QueryVideoResult[] {
  return videos.filter(
    (video) =>
      gradeMeets(video.performance.grade, minPerformanceGrade) &&
      gradeMeets(video.contribution.grade, minContributionGrade),
  );
}

function sortVideos(
  videos: QueryVideoResult[],
  sort: QueryKeywordSearchInput['sort'],
): QueryVideoResult[] {
  return [...videos].sort((a, b) => {
    if (sort === 'position_asc') return (a.position ?? 0) - (b.position ?? 0);
    if (sort === 'view_count_desc') return (b.viewCount ?? 0) - (a.viewCount ?? 0);
    if (sort === 'published_at_desc') {
      return Date.parse(b.publishedAt ?? '') - Date.parse(a.publishedAt ?? '');
    }
    return (
      (b.lengthAdjustment.adjustedScore ?? -Infinity) -
      (a.lengthAdjustment.adjustedScore ?? -Infinity)
    );
  });
}

export async function keywordSummary(
  input: KeywordSummaryInput,
): Promise<KeywordSummaryOutput> {
  const keywords = await Promise.all(
    input.keywords.map(async (keyword) => {
      const rows = await getLatestKeywordVideos({ keyword, limit: input.limit });
      const videos = rows.map(toQueryVideo);
      return {
        keyword,
        ...summarize(videos),
      };
    }),
  );
  return { keywords };
}

export async function queryKeywordSearch(
  input: QueryKeywordSearchInput,
): Promise<QueryKeywordSearchOutput> {
  const keywords = await Promise.all(
    input.keywords.map(async (keyword) => {
      const rows = await getLatestKeywordVideos({ keyword, limit: input.limit });
      const allVideos = rows.map(toQueryVideo);
      const videos = sortVideos(
        filterByGrades(allVideos, input.minPerformanceGrade, input.minContributionGrade),
        input.sort,
      ).slice(0, input.limit);
      return {
        keyword,
        summary: summarize(allVideos).summary,
        videos,
      };
    }),
  );
  return { keywords };
}

export async function queryHotVideos(input: QueryHotVideosInput): Promise<QueryHotVideosOutput> {
  const rows = await getHotVideos({
    date: input.date ?? null,
    dateEnd: input.dateEnd ?? null,
    limit: input.limit,
  });
  const videos = rows
    .map((row) => ({
      ...toQueryVideo(row),
      hotVideoId: row.hotVideo.id,
      hotDate: row.hotVideo.hotDate,
      source: row.hotVideo.source,
      chartRank: row.hotVideo.chartRank,
    }))
    .filter(
      (video) =>
        gradeMeets(video.performance.grade, input.minPerformanceGrade) &&
        gradeMeets(video.contribution.grade, input.minContributionGrade),
    );
  return {
    date: input.date ?? null,
    dateEnd: input.dateEnd ?? null,
    videos,
  };
}

export async function queryComments(input: QueryCommentsInput): Promise<QueryCommentsOutput> {
  const comments = await getCommentsByVideoIds({
    videoIds: input.videoIds,
    minLikeCount: input.minLikeCount,
    limit: input.limit,
  });
  return {
    comments: comments.map((comment) => ({
      commentId: comment.commentId,
      videoId: comment.videoId,
      text: comment.body,
      likeCount: comment.likeCount,
      publishedAt: isoOrNull(comment.publishedAt),
    })),
  };
}

export async function videoCandidateLookup(
  input: VideoCandidateLookupInput,
): Promise<VideoCandidateLookupOutput> {
  const rows = await getVideosByIds(input.videoIds);
  const byId = new Map(rows.map((row) => [row.video.videoId, toQueryVideo(row)]));
  return {
    videos: input.videoIds.map((id) => byId.get(id)).filter((v): v is QueryVideoResult => v != null),
  };
}
