import { z } from 'zod';

export const ScoreGradeSchema = z.enum([
  'Unknown',
  'Worst',
  'Bad',
  'Normal',
  'Good',
  'Great',
]);

export const ScoreGradeDistributionSchema = z.record(
  ScoreGradeSchema,
  z.number().int().nonnegative(),
);

export const KeywordProbeMetricsSchema = z.object({
  probeId: z.string().uuid(),
  harvestId: z.string().uuid(),
  keywords: z.array(z.string()).min(1),
  regionCode: z.string(),
  collectedAt: z.string().datetime(),
  candidateCount: z.number().int().nonnegative(),
  scoredCount: z.number().int().nonnegative(),
  totalViews: z.number().int().nonnegative(),
  averageViews: z.number().nonnegative(),
  medianViews: z.number().nonnegative().optional(),
  goodPlusCount: z.number().int().nonnegative(),
  goodPlusRatio: z.number().min(0).max(1),
  performanceGradeDistribution: ScoreGradeDistributionSchema,
  contributionGradeDistribution: ScoreGradeDistributionSchema,
  absoluteViewGradeDistribution: ScoreGradeDistributionSchema,
  policyVersion: z.literal('youtube_score_v2'),
});

export const HotCandidateLineageSchema = z.object({
  probeId: z.string().uuid(),
  harvestId: z.string().uuid(),
  keyword: z.string(),
  keywordRank: z.number().int().positive(),
  policyVersion: z.literal('youtube_score_v2'),
});

export const HotCandidateExplanationSchema = z.object({
  summary: z.string().min(1),
  performanceGrade: z.string(),
  contributionGrade: z.string(),
  absoluteViewGrade: z.string(),
  recencyLabel: z.string().optional(),
});

export const VideoScoreV2Schema = z.object({
  performance: z.object({
    ratio: z.number().nullable(),
    grade: ScoreGradeSchema,
  }),
  contribution: z.object({
    ratio: z.number().nullable(),
    grade: ScoreGradeSchema,
  }),
  lengthAdjustment: z.object({
    baseScore: z.number().nullable(),
    durationSec: z.number().nullable(),
    referenceDurationSec: z.number(),
    weight: z.number(),
    adjustedScore: z.number().nullable(),
  }),
  highPerforming: z.boolean(),
  policyVersion: z.literal('youtube_score_v2'),
  absoluteViews: z.object({
    viewCount: z.number().nullable(),
    grade: ScoreGradeSchema,
    multiplier: z.number(),
  }),
  recency: z.object({
    daysSincePublish: z.number().nullable(),
    score: z.number().nullable(),
    label: z.string().nullable(),
  }),
  rankScore: z.number().nullable(),
});

export const KeywordHotCandidateSchema = z.object({
  videoId: z.string(),
  title: z.string(),
  channelTitle: z.string(),
  publishedAt: z.string().datetime().optional(),
  viewCount: z.number().int().nonnegative().optional(),
  isShort: z.boolean().nullable(),
  score: VideoScoreV2Schema,
  lineage: HotCandidateLineageSchema,
  explanation: HotCandidateExplanationSchema,
  poolSource: z.enum(['keyword', 'keyword_promoted']),
});

export const KeywordHotCandidatesResponseSchema = z.object({
  harvestId: z.string().uuid(),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
  candidates: z.array(KeywordHotCandidateSchema),
});

export type KeywordProbeMetrics = z.infer<typeof KeywordProbeMetricsSchema>;
export type KeywordHotCandidate = z.infer<typeof KeywordHotCandidateSchema>;
export type KeywordHotCandidatesResponse = z.infer<
  typeof KeywordHotCandidatesResponseSchema
>;
