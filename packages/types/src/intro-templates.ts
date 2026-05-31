import { z } from 'zod';
import { CreativeTemplateSlotSchemaJson } from './creative-templates';
import { ReferenceVideoLineageSchema } from './reference-folders';
import { ScoreGradeSchema } from './probe-metrics';

export const TranscriptProviderSchema = z.enum([
  'youtube_captions',
  'yt_dlp',
  'manual_upload',
  'unavailable',
]);

export const TranscriptAvailabilitySchema = z.enum([
  'available',
  'pending',
  'disabled_no_captions',
  'failed',
  'blocked_policy',
]);

export const IntroStructureSlotCodeSchema = z.enum([
  'situation',
  'tension',
  'surprising_claim',
  'credibility_proof',
  'promise',
  'transition',
]);

export const IntroStructureSlotsSchema = z.object({
  situation: z.string().max(2000).optional(),
  tension: z.string().max(2000).optional(),
  surprisingClaim: z.string().max(2000).optional(),
  credibilityProof: z.string().max(2000).optional(),
  promise: z.string().max(2000).optional(),
  transition: z.string().max(2000).optional(),
  notes: z.string().optional(),
});

export const IntroSkeletonSchema = z.object({
  version: z.literal(1),
  slotOrder: z.array(IntroStructureSlotCodeSchema).min(1),
  locale: z.enum(['ko', 'en', 'mixed']).default('ko'),
});

export const IntroTemplateDefaultStyleSchema = z.object({
  primaryCategory: z.string().optional(),
  pacing: z.enum(['fast', 'measured']).optional(),
  locale: z.enum(['ko', 'en', 'mixed']).optional(),
});

export const TranscriptSegmentSchema = z.object({
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  text: z.string(),
});

export const VideoTranscriptStatusSchema = z.object({
  videoId: z.string(),
  provider: TranscriptProviderSchema,
  availability: TranscriptAvailabilitySchema,
  legalNoticeCode: z.string().nullable(),
  language: z.string(),
  segments: z.array(TranscriptSegmentSchema).optional(),
  fullText: z.string().nullable(),
  errorMessage: z.string().nullable(),
  userTriggered: z.boolean(),
});

export const IntroSegmentSourceModeSchema = z.enum([
  'extracted',
  'manual',
  'imported_seed',
]);

export const IntroSegmentSummarySchema = z.object({
  id: z.string().uuid(),
  videoId: z.string(),
  excerptText: z.string(),
  sourceMode: IntroSegmentSourceModeSchema,
  structureExtractor: z.string(),
  structureSlots: IntroStructureSlotsSchema,
  manualStructureNotes: IntroStructureSlotsSchema.nullable(),
  windowStartMs: z.number().int(),
  windowEndMs: z.number().int(),
});

export const IntroTemplateCategorySchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  templateCount: z.number().int(),
});

export const IntroTemplateTagSchema = z.object({
  code: z.string(),
  name: z.string(),
  kind: z.string(),
  templateCount: z.number().int(),
});

export const IntroTemplateCardSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  summary: z.string(),
  primaryCategory: z
    .object({
      code: z.string(),
      name: z.string(),
    })
    .nullable(),
  tags: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
    }),
  ),
  referenceCount: z.number().int(),
  topPerformanceGrade: ScoreGradeSchema.nullable(),
  slotOrderPreview: z.array(IntroStructureSlotCodeSchema),
});

export const IntroTemplateDetailSchema = IntroTemplateCardSchema.extend({
  useWhen: z.string(),
  skeleton: IntroSkeletonSchema,
  slotSchema: CreativeTemplateSlotSchemaJson,
  defaultStyle: IntroTemplateDefaultStyleSchema.nullable(),
  examples: z.array(
    z.object({
      label: z.string(),
      filledIntro: z.string(),
      slotValues: z.record(z.string(), z.string()),
    }),
  ),
  evidence: z.array(
    z.object({
      segmentId: z.string().uuid(),
      videoId: z.string(),
      title: z.string(),
      channelTitle: z.string().nullable(),
      excerptText: z.string(),
      sourceMode: IntroSegmentSourceModeSchema,
      structureSlots: IntroStructureSlotsSchema,
      lineage: ReferenceVideoLineageSchema.nullable(),
      evidenceNote: z.string().nullable(),
    }),
  ),
});

export const IntroTemplateListQuerySchema = z.object({
  category: z.string().optional(),
  tag: z.string().optional(),
  q: z.string().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(48).optional(),
});

export const IntroTemplateListResponseSchema = z.object({
  templates: z.array(IntroTemplateCardSchema),
  nextCursor: z.string().uuid().nullable(),
});

export const IntroGenerateRequestSchema = z.object({
  userBrief: z.string().min(1).max(4000),
});

export const IntroGenerateResponseSchema = z.object({
  jobId: z.string().uuid(),
  status: z.enum(['queued', 'running', 'succeeded', 'failed']),
  draftText: z.string().nullable(),
  lineage: z.object({
    introTemplateId: z.string().uuid(),
    sourceSegmentIds: z.array(z.string().uuid()),
    sourceVideoIds: z.array(z.string()),
    structureExtractor: z.string(),
    sourceMode: z.string(),
  }),
});

export const CreateIntroSegmentManualBodySchema = z.object({
  manualStructureNotes: IntroStructureSlotsSchema,
  excerptText: z.string().min(1).max(8000).optional(),
});

export type IntroStructureSlotCode = z.infer<typeof IntroStructureSlotCodeSchema>;
export type IntroStructureSlots = z.infer<typeof IntroStructureSlotsSchema>;
export type IntroSkeleton = z.infer<typeof IntroSkeletonSchema>;
export type IntroTemplateCard = z.infer<typeof IntroTemplateCardSchema>;
export type IntroTemplateDetail = z.infer<typeof IntroTemplateDetailSchema>;
export type IntroTemplateCategory = z.infer<typeof IntroTemplateCategorySchema>;
export type IntroTemplateTag = z.infer<typeof IntroTemplateTagSchema>;
export type IntroTemplateListQuery = z.infer<typeof IntroTemplateListQuerySchema>;
export type IntroGenerateRequest = z.infer<typeof IntroGenerateRequestSchema>;
export type IntroGenerateResponse = z.infer<typeof IntroGenerateResponseSchema>;
export type IntroSegmentSummary = z.infer<typeof IntroSegmentSummarySchema>;
export type VideoTranscriptStatus = z.infer<typeof VideoTranscriptStatusSchema>;
