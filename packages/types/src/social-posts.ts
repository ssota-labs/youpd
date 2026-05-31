import { z } from 'zod';
import { ConsumerStageSchema } from './home-feed';
import { ScoreGradeSchema } from './probe-metrics';

export const SocialProviderSchema = z.enum(['manual', 'threads', 'x_bookmarks']);
export const SocialConnectionStatusSchema = z.enum([
  'not_configured',
  'configured',
  'error',
  'disabled',
]);
export const SocialIngestModeSchema = z.enum(['url_fetch', 'provider_sync', 'manual']);
export const SocialFetchStatusSchema = z.enum([
  'ok',
  'partial',
  'failed',
  'user_provided',
]);

export const SocialPostMetricsSchema = z.object({
  likeCount: z.number().int().nonnegative().optional(),
  replyCount: z.number().int().nonnegative().optional(),
  repostCount: z.number().int().nonnegative().optional(),
  quoteCount: z.number().int().nonnegative().optional(),
  viewCount: z.number().int().nonnegative().optional(),
  bookmarkCount: z.number().int().nonnegative().optional(),
});

export const SocialPostLineageSchema = z.object({
  sourcePostId: z.string().uuid(),
  sourceProvider: SocialProviderSchema,
  permalink: z.string().url(),
  metricSnapshotId: z.string().uuid(),
  policyVersion: z.literal('social_score_v1'),
  performanceGrade: ScoreGradeSchema,
  engagementGrade: ScoreGradeSchema,
  recencyGrade: ScoreGradeSchema,
  rankScore: z.number().nullable(),
  recommendationReason: z.string(),
  consumerStageAtSave: ConsumerStageSchema.optional(),
});

export const SocialSourceSummarySchema = z.object({
  provider: SocialProviderSchema,
  connectionStatus: SocialConnectionStatusSchema,
  lastSyncedAt: z.string().datetime().nullable(),
  lastError: z.string().nullable(),
});

export const SocialPostSummarySchema = z.object({
  id: z.string().uuid(),
  provider: SocialProviderSchema,
  permalink: z.string().url(),
  authorHandle: z.string(),
  textPreview: z.string(),
  publishedAt: z.string().datetime().nullable(),
  ingestMode: SocialIngestModeSchema,
  fetchStatus: SocialFetchStatusSchema,
  latestGrades: z.object({
    performance: ScoreGradeSchema,
    engagement: ScoreGradeSchema,
    recency: ScoreGradeSchema,
  }),
  updatedAt: z.string().datetime(),
});

export const SocialPostDetailSchema = SocialPostSummarySchema.extend({
  authorDisplayName: z.string().nullable(),
  textContent: z.string(),
  metricSnapshots: z.array(
    z.object({
      id: z.string().uuid(),
      capturedAt: z.string().datetime(),
      metrics: SocialPostMetricsSchema,
      source: z.string(),
    }),
  ),
  latestScore: z
    .object({
      id: z.string().uuid(),
      policyVersion: z.literal('social_score_v1'),
      performanceGrade: ScoreGradeSchema,
      engagementGrade: ScoreGradeSchema,
      recencyGrade: ScoreGradeSchema,
      rankScore: z.number().nullable(),
      scoreBreakdown: z.record(z.string(), z.unknown()),
      computedAt: z.string().datetime(),
    })
    .nullable(),
});

export const IngestSocialUrlInputSchema = z.object({
  url: z.string().url(),
});

export const IngestSocialManualInputSchema = z.object({
  permalink: z.string().url(),
  authorHandle: z.string().min(1).max(200),
  authorDisplayName: z.string().max(200).optional(),
  textContent: z.string().min(1).max(20_000),
  publishedAt: z.string().datetime().optional(),
  metrics: SocialPostMetricsSchema.optional(),
});

export const AddReferenceSocialPostInputSchema = z.object({
  socialPostId: z.string().uuid(),
  saveReason: z.string().max(500).nullable().optional(),
});

export const ReferenceFolderSocialPostItemSchema = z.object({
  id: z.string().uuid(),
  socialPostId: z.string().uuid(),
  permalink: z.string().url(),
  authorHandle: z.string(),
  textPreview: z.string(),
  lineage: SocialPostLineageSchema,
  saveReason: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type SocialProvider = z.infer<typeof SocialProviderSchema>;
export type SocialConnectionStatus = z.infer<typeof SocialConnectionStatusSchema>;
export type SocialPostMetrics = z.infer<typeof SocialPostMetricsSchema>;
export type SocialPostLineage = z.infer<typeof SocialPostLineageSchema>;
export type SocialSourceSummary = z.infer<typeof SocialSourceSummarySchema>;
export type SocialPostSummary = z.infer<typeof SocialPostSummarySchema>;
export type SocialPostDetail = z.infer<typeof SocialPostDetailSchema>;
export type IngestSocialUrlInput = z.infer<typeof IngestSocialUrlInputSchema>;
export type IngestSocialManualInput = z.infer<typeof IngestSocialManualInputSchema>;
export type AddReferenceSocialPostInput = z.infer<
  typeof AddReferenceSocialPostInputSchema
>;
export type ReferenceFolderSocialPostItem = z.infer<
  typeof ReferenceFolderSocialPostItemSchema
>;
