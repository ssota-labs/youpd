import { z } from 'zod';
import { ReferenceVideoLineageSchema } from './reference-folders';
import { ScoreGradeSchema } from './probe-metrics';

export const CreativeTemplateSlotTypeSchema = z.enum([
  'text',
  'number',
  'person',
  'image',
  'product',
  'brand_asset',
  'color_palette',
  'chart_data',
]);

export const CreativeTemplateSlotSchema = z.object({
  key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
  label: z.string(),
  type: CreativeTemplateSlotTypeSchema,
  required: z.boolean().default(true),
  description: z.string().optional(),
  defaultValue: z.unknown().optional(),
  constraints: z.record(z.string(), z.unknown()).optional(),
});

export const CreativeTemplateSlotSchemaJson = z
  .object({
    version: z.literal(1),
    slots: z.array(CreativeTemplateSlotSchema).min(1),
  })
  .superRefine((value, ctx) => {
    const keys = value.slots.map((slot) => slot.key);
    const seen = new Set<string>();
    for (const key of keys) {
      if (seen.has(key)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate slot key: ${key}`,
          path: ['slots'],
        });
        return;
      }
      seen.add(key);
    }
  });

export const ThumbnailSkeletonSchema = z.object({
  version: z.literal(1),
  aspect: z.enum(['16:9', '9:16']).default('16:9'),
  regions: z.array(
    z.object({
      id: z.string(),
      role: z.enum([
        'background',
        'subject',
        'text_primary',
        'text_secondary',
        'badge',
        'chart',
        'logo',
      ]),
      box: z.object({
        x: z.number(),
        y: z.number(),
        w: z.number(),
        h: z.number(),
      }),
      bindsSlot: z.string().optional(),
    }),
  ),
});

export const ThumbnailObservedAxesSchema = z.object({
  visualHierarchy: z.enum(['low', 'medium', 'high']).optional(),
  textDensity: z.enum(['none', 'low', 'medium', 'high']).optional(),
  faceTreatment: z.enum(['none', 'small', 'dominant']).optional(),
  thumbnailEmotion: z.string().optional(),
  titleThumbnailAlignment: z.enum(['weak', 'moderate', 'strong']).optional(),
  notes: z.string().optional(),
});

export const ThumbnailTemplateCategorySchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  templateCount: z.number().int(),
});

export const ThumbnailTemplateTagSchema = z.object({
  code: z.string(),
  name: z.string(),
  kind: z.string(),
  templateCount: z.number().int(),
});

export const ThumbnailTemplateCardSchema = z.object({
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
  previewImageUrl: z.string().nullable(),
  referenceCount: z.number().int(),
  topPerformanceGrade: ScoreGradeSchema.nullable(),
});

export const ThumbnailTemplateDetailSchema = ThumbnailTemplateCardSchema.extend({
  useWhen: z.string(),
  skeleton: ThumbnailSkeletonSchema,
  slotSchema: CreativeTemplateSlotSchemaJson,
  promptScaffold: z.string(),
  defaultStyle: z.record(z.string(), z.unknown()),
  references: z.array(
    z.object({
      videoId: z.string(),
      title: z.string(),
      channelTitle: z.string(),
      thumbnailUrl: z.string().nullable(),
      observedAxes: ThumbnailObservedAxesSchema,
      lineage: ReferenceVideoLineageSchema.nullable(),
      sourceFolderVideoId: z.string().uuid().nullable(),
    }),
  ),
});

export const ThumbnailTemplateListQuerySchema = z.object({
  category: z.string().optional(),
  tag: z.string().optional(),
  q: z.string().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const ThumbnailTemplateListResponseSchema = z.object({
  templates: z.array(ThumbnailTemplateCardSchema),
  nextCursor: z.string().uuid().nullable(),
});

export type CreativeTemplateSlot = z.infer<typeof CreativeTemplateSlotSchema>;
export type ThumbnailSkeleton = z.infer<typeof ThumbnailSkeletonSchema>;
export type ThumbnailObservedAxes = z.infer<typeof ThumbnailObservedAxesSchema>;
export type ThumbnailTemplateCategory = z.infer<typeof ThumbnailTemplateCategorySchema>;
export type ThumbnailTemplateTag = z.infer<typeof ThumbnailTemplateTagSchema>;
export type ThumbnailTemplateCard = z.infer<typeof ThumbnailTemplateCardSchema>;
export type ThumbnailTemplateDetail = z.infer<typeof ThumbnailTemplateDetailSchema>;
export type ThumbnailTemplateListQuery = z.infer<typeof ThumbnailTemplateListQuerySchema>;
