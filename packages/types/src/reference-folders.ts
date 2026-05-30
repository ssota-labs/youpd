import { z } from 'zod';
import { ConsumerStageSchema } from './home-feed';
import { KeywordHotCandidateSchema, ScoreGradeSchema } from './probe-metrics';

export const ReferenceVideoLineageSchema = z.object({
  sourceHarvestId: z.string().uuid(),
  sourceUserProbeId: z.string().uuid().optional(),
  sourceKeyword: z.string(),
  keywordRank: z.number().int().positive(),
  policyVersion: z.literal('youtube_score_v2'),
  performanceGrade: ScoreGradeSchema,
  contributionGrade: ScoreGradeSchema,
  absoluteViewGrade: ScoreGradeSchema,
  rankScore: z.number().nullable(),
  recommendationReason: z.string(),
  poolSource: z.enum(['keyword', 'keyword_promoted']),
  consumerStageAtSave: ConsumerStageSchema.optional(),
  viewCountAtSave: z.number().int().nonnegative().optional(),
});

export const ReferenceFolderGroupSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  audience: z.string(),
  seedTheme: z.string(),
  intentSummary: z.string(),
  folderCount: z.number().int(),
  videoCount: z.number().int(),
  updatedAt: z.string().datetime(),
});

export const ReferenceFolderSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid(),
  name: z.string(),
  consumerStage: ConsumerStageSchema.nullable(),
  sortOrder: z.number().int(),
  isStageTemplate: z.boolean(),
  isUnspecified: z.boolean(),
  videoCount: z.number().int(),
});

export const ReferenceFolderGroupDetailSchema = ReferenceFolderGroupSummarySchema.extend({
  originUserProbeId: z.string().uuid().nullable(),
  folders: z.array(ReferenceFolderSchema),
});

export const ReferenceFolderVideoItemSchema = z.object({
  id: z.string().uuid(),
  videoId: z.string(),
  title: z.string(),
  channelTitle: z.string(),
  thumbnailUrl: z.string().nullable(),
  lineage: ReferenceVideoLineageSchema,
  saveReason: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const CreateReferenceGroupInputSchema = z.object({
  title: z.string().min(1).max(200),
  audience: z.string().min(1).max(2000),
  seedTheme: z.string().min(1).max(2000),
  intentSummary: z.string().min(1).max(4000),
  originUserProbeId: z.string().uuid().optional(),
  profileSnapshot: z.record(z.string(), z.unknown()).optional(),
  seedStageFolders: z.boolean().optional(),
});

export const CreateReferenceFolderInputSchema = z.object({
  groupId: z.string().uuid(),
  name: z.string().min(1).max(200),
  consumerStage: ConsumerStageSchema.nullable().optional(),
  isUnspecified: z.boolean().optional(),
});

export const AddReferenceVideoInputSchema = z.object({
  hotCandidate: KeywordHotCandidateSchema.optional(),
  videoId: z.string().optional(),
  lineage: ReferenceVideoLineageSchema.optional(),
  saveReason: z.string().max(500).nullable().optional(),
  allowSubGoodPlus: z.boolean().optional(),
});

export type ReferenceVideoLineage = z.infer<typeof ReferenceVideoLineageSchema>;
export type ReferenceFolderGroupSummary = z.infer<
  typeof ReferenceFolderGroupSummarySchema
>;
export type ReferenceFolder = z.infer<typeof ReferenceFolderSchema>;
export type ReferenceFolderGroupDetail = z.infer<
  typeof ReferenceFolderGroupDetailSchema
>;
export type ReferenceFolderVideoItem = z.infer<typeof ReferenceFolderVideoItemSchema>;
export type CreateReferenceGroupInput = z.infer<typeof CreateReferenceGroupInputSchema>;
export type CreateReferenceFolderInput = z.infer<typeof CreateReferenceFolderInputSchema>;
export type AddReferenceVideoInput = z.infer<typeof AddReferenceVideoInputSchema>;
