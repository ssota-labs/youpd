import { z } from 'zod';

const RegionCodeSchema = z.string().length(2).default('KR');

export const AnalyzeVideoInputSchema = z
  .object({
    videoId: z.string().min(1).max(50),
    includeComments: z.boolean().default(true),
    commentsTopN: z.number().int().min(0).max(100).default(50),
  })
  .strict();
export type AnalyzeVideoInput = z.infer<typeof AnalyzeVideoInputSchema>;

export const AnalyzeChannelInputSchema = z
  .object({
    channelId: z.string().min(1).max(50),
    maxVideos: z.number().int().min(1).max(500).default(500),
    topPerformingLimit: z.number().int().min(1).max(50).default(10),
    includeComments: z.boolean().default(false),
  })
  .strict();
export type AnalyzeChannelInput = z.infer<typeof AnalyzeChannelInputSchema>;

export const SearchKeywordWorkflowInputSchema = z
  .object({
    keyword: z.string().min(1).max(200),
    regionCode: RegionCodeSchema,
    limit: z.number().int().min(1).max(50).default(50),
    order: z
      .enum(['date', 'rating', 'relevance', 'title', 'videoCount', 'viewCount'])
      .default('relevance'),
  })
  .strict();
export type SearchKeywordWorkflowInput = z.infer<
  typeof SearchKeywordWorkflowInputSchema
>;

export const GetTrendingVideosInputSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    regionCode: RegionCodeSchema,
    categoryId: z.string().nullable().optional(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .strict();
export type GetTrendingVideosInput = z.infer<
  typeof GetTrendingVideosInputSchema
>;

export const CollectTrendingDailyInputSchema = z
  .object({
    regionCode: RegionCodeSchema,
    categoryId: z.string().nullable().optional(),
    limit: z.number().int().min(1).max(50).default(50),
    autoAnalyzeTop: z.number().int().min(0).max(20).default(10),
  })
  .strict();
export type CollectTrendingDailyInput = z.infer<
  typeof CollectTrendingDailyInputSchema
>;

export const CaptureDailySnapshotsInputSchema = z
  .object({
    snapshotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    videoBatchSize: z.number().int().min(1).max(500).default(500),
    channelBatchSize: z.number().int().min(1).max(500).default(500),
  })
  .strict();
export type CaptureDailySnapshotsInput = z.infer<
  typeof CaptureDailySnapshotsInputSchema
>;

/** Bulk daily mostPopular collection for all configured region×category targets. */
export const CollectTrendingMatrixDailyInputSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    limit: z.number().int().min(1).max(50).default(50),
    regionCodes: z.array(z.string().length(2)).optional(),
    categoryIds: z.array(z.string().min(1)).optional(),
  })
  .strict();
export type CollectTrendingMatrixDailyInput = z.infer<
  typeof CollectTrendingMatrixDailyInputSchema
>;
