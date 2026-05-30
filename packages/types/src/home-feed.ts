import { z } from 'zod';

export const ConsumerStageSchema = z.enum([
  'unaware',
  'problem_aware',
  'solution_aware',
  'product_aware',
  'most_aware',
]);

export const ProbeStatusSchema = z.enum([
  'draft',
  'confirmed',
  'running',
  'completed',
  'dismissed',
]);

export const KeywordProbeSchema = z.object({
  id: z.string().uuid(),
  probeLabel: z.string().min(1),
  audience: z.string(),
  seedTheme: z.string(),
  problemOrSituation: z.string(),
  goal: z.string(),
  consumerStage: ConsumerStageSchema,
  rationale: z.string(),
  searchStatus: z.enum(['ready', 'running', 'stale', 'not_run']),
  suggestedKeywords: z.array(z.string()).default([]),
  status: ProbeStatusSchema.default('draft'),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
  generationRunId: z.string().uuid().optional(),
  linkedHarvestId: z.string().uuid().optional(),
});

export const ReferenceCandidateSchema = z.object({
  id: z.string().uuid(),
  probeId: z.string().uuid(),
  videoId: z.string(),
  title: z.string(),
  channelTitle: z.string(),
  publishedAt: z.string().datetime().optional(),
  viewCount: z.number().int().nonnegative().optional(),
  recommendationReason: z.string().min(1),
  performanceHint: z.string().optional(),
});

export const HomeOnboardingSchema = z.object({
  interestTopics: z.string().min(1),
  channelDescription: z.string().min(1),
});

export const HomeFeedResponseSchema = z.object({
  onboarding: HomeOnboardingSchema.nullable(),
  probes: z.array(KeywordProbeSchema),
  candidates: z.array(ReferenceCandidateSchema),
  systemStatus: z.object({
    youtubeKeys: z.enum(['healthy', 'degraded', 'not_configured']),
    quotaLabel: z.string().optional(),
    lastHarvestAt: z.string().datetime().optional(),
  }),
  source: z.enum(['live', 'fixture']),
});

export type ConsumerStage = z.infer<typeof ConsumerStageSchema>;
export type ProbeStatus = z.infer<typeof ProbeStatusSchema>;
export type KeywordProbe = z.infer<typeof KeywordProbeSchema>;
export type ReferenceCandidate = z.infer<typeof ReferenceCandidateSchema>;
export type HomeOnboarding = z.infer<typeof HomeOnboardingSchema>;
export type HomeFeedResponse = z.infer<typeof HomeFeedResponseSchema>;
