import { z } from 'zod';
import { ReferenceVideoLineageSchema } from './reference-folders';
import { CreativeTemplateSlotSchemaJson } from './creative-templates';
import { ScoreGradeSchema } from './probe-metrics';

export const TitleHookTypeSchema = z.enum([
  'curiosity_gap',
  'contrast',
  'numeric_emphasis',
  'social_proof',
  'question',
  'warning',
  'story_hook',
  'how_to_promise',
  'controversy',
  'listicle',
]);

export const TitleShapeSchema = z.enum([
  'short_label',
  'colon_two_part',
  'parenthetical',
  'list_enumeration',
  'conversational',
  'quote_style',
]);

export const TitleToneSchema = z.enum([
  'urgent',
  'playful',
  'authoritative',
  'empathetic',
  'contrarian',
  'educational',
]);

export const TitleObservedAxesSchema = z.object({
  hookType: TitleHookTypeSchema.optional(),
  titleShape: TitleShapeSchema.optional(),
  tones: z.array(TitleToneSchema).max(3).optional(),
  specificity: z.enum(['low', 'medium', 'high']).optional(),
  freeTags: z.array(z.string().max(40)).max(8).optional(),
  notes: z.string().optional(),
});

export const CopySkeletonSchema = z.object({
  version: z.literal(1),
  pattern: z.string().min(1),
  locale: z.enum(['ko', 'en', 'mixed']).default('ko'),
});

export const CopyTemplateDefaultStyleSchema = z.object({
  hookType: TitleHookTypeSchema.optional(),
  titleShape: TitleShapeSchema.optional(),
  tones: z.array(TitleToneSchema).optional(),
  rationale: z.string().optional(),
});

export const CopyTemplateSlotValuesSchema = z.record(z.string(), z.string());

export const CopyTemplateFillRequestSchema = z.object({
  slotValues: CopyTemplateSlotValuesSchema,
});

export const CopyTemplateFillResponseSchema = z.object({
  filledTitle: z.string(),
  slotValues: CopyTemplateSlotValuesSchema,
});

export const CopyTemplateCategorySchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  templateCount: z.number().int(),
});

export const CopyTemplateTagSchema = z.object({
  code: z.string(),
  name: z.string(),
  kind: z.string(),
  templateCount: z.number().int(),
});

export const CopyTemplateCardSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  summary: z.string(),
  primaryHookType: TitleHookTypeSchema.nullable(),
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
  pairedThumbnailCount: z.number().int(),
});

export const CopyTemplateDetailSchema = CopyTemplateCardSchema.extend({
  useWhen: z.string(),
  skeleton: CopySkeletonSchema,
  slotSchema: CreativeTemplateSlotSchemaJson,
  hookType: TitleHookTypeSchema.nullable(),
  titleShape: TitleShapeSchema.nullable(),
  tones: z.array(TitleToneSchema),
  rationale: z.string().nullable(),
  examples: z.array(
    z.object({
      label: z.string(),
      filledTitle: z.string(),
      slotValues: CopyTemplateSlotValuesSchema,
    }),
  ),
  titleEvidence: z.array(
    z.object({
      analysisId: z.string().uuid(),
      videoId: z.string(),
      title: z.string(),
      channelTitle: z.string(),
      observedAxes: TitleObservedAxesSchema,
      lineage: ReferenceVideoLineageSchema.nullable(),
    }),
  ),
  thumbnailPairings: z.array(
    z.object({
      thumbnailTemplateId: z.string().uuid(),
      code: z.string(),
      name: z.string(),
      previewImageUrl: z.string().nullable(),
      pairingRationale: z.string().nullable(),
    }),
  ),
});

export const CopyTemplateListQuerySchema = z.object({
  category: z.string().optional(),
  tag: z.string().optional(),
  hookType: TitleHookTypeSchema.optional(),
  q: z.string().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const CopyTemplateListResponseSchema = z.object({
  templates: z.array(CopyTemplateCardSchema),
  nextCursor: z.string().uuid().nullable(),
});

export type TitleHookType = z.infer<typeof TitleHookTypeSchema>;
export type TitleShape = z.infer<typeof TitleShapeSchema>;
export type TitleTone = z.infer<typeof TitleToneSchema>;
export type TitleObservedAxes = z.infer<typeof TitleObservedAxesSchema>;
export type CopySkeleton = z.infer<typeof CopySkeletonSchema>;
export type CopyTemplateCard = z.infer<typeof CopyTemplateCardSchema>;
export type CopyTemplateDetail = z.infer<typeof CopyTemplateDetailSchema>;
export type CopyTemplateListQuery = z.infer<typeof CopyTemplateListQuerySchema>;
export type CopyTemplateFillRequest = z.infer<typeof CopyTemplateFillRequestSchema>;
export type CopyTemplateFillResponse = z.infer<typeof CopyTemplateFillResponseSchema>;
export type CopyTemplateCategory = z.infer<typeof CopyTemplateCategorySchema>;
export type CopyTemplateTag = z.infer<typeof CopyTemplateTagSchema>;
