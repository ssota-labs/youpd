import { z } from 'zod';
import { CreativeTemplateSlotSchemaJson, ThumbnailTemplateDetailSchema } from './creative-templates';

export const THUMBNAIL_PROMPT_VERSION = 'thumbnail-prompt-v1';

export const ThumbnailSlotValuesSchema = z.object({
  version: z.literal(1),
  values: z.record(z.string(), z.union([z.string(), z.number()])),
});

export const GeneratedAssetLineageSchema = z.object({
  templateId: z.string().uuid(),
  templateCode: z.string(),
  templateVersion: z.string(),
  slotValues: ThumbnailSlotValuesSchema,
  promptVersion: z.string(),
  promptHash: z.string(),
  providerKey: z.string(),
  referenceVideoIds: z.array(z.string()).optional(),
});

export const ThumbnailGenerationJobStatusSchema = z.enum([
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
]);

export const ThumbnailGenerationProviderStatusSchema = z.object({
  configured: z.boolean(),
  providerKey: z.string().nullable(),
});

export const ThumbnailCreateBootstrapSchema = z.object({
  template: ThumbnailTemplateDetailSchema,
  draft: z
    .object({
      id: z.string().uuid(),
      slotValues: ThumbnailSlotValuesSchema,
      selectedReferenceVideoIds: z.array(z.string()).optional(),
      updatedAt: z.string(),
    })
    .nullable(),
  providerStatus: ThumbnailGenerationProviderStatusSchema,
});

export const UpsertThumbnailDraftRequestSchema = z.object({
  templateId: z.string().uuid(),
  slotValues: ThumbnailSlotValuesSchema,
  selectedReferenceVideoIds: z.array(z.string()).max(3).optional(),
});

export const UpsertThumbnailDraftResponseSchema = z.object({
  draftId: z.string().uuid(),
  updatedAt: z.string(),
});

export const CreateThumbnailJobRequestSchema = z.object({
  templateId: z.string().uuid(),
  slotValues: ThumbnailSlotValuesSchema,
  selectedReferenceVideoIds: z.array(z.string()).max(3).optional(),
  draftId: z.string().uuid().optional(),
});

export const ThumbnailGenerationAssetSchema = z.object({
  id: z.string().uuid(),
  previewUrl: z.string(),
  mimeType: z.string(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  lineage: GeneratedAssetLineageSchema,
});

export const ThumbnailGenerationJobSchema = z.object({
  id: z.string().uuid(),
  templateId: z.string().uuid(),
  status: ThumbnailGenerationJobStatusSchema,
  providerKey: z.string(),
  promptVersion: z.string(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  assets: z.array(ThumbnailGenerationAssetSchema),
});

export const ThumbnailGenerationJobListSchema = z.object({
  jobs: z.array(
    ThumbnailGenerationJobSchema.pick({
      id: true,
      templateId: true,
      status: true,
      providerKey: true,
      createdAt: true,
      finishedAt: true,
    }).extend({
      assetCount: z.number().int(),
    }),
  ),
});

export type ThumbnailSlotValues = z.infer<typeof ThumbnailSlotValuesSchema>;
export type GeneratedAssetLineage = z.infer<typeof GeneratedAssetLineageSchema>;
export type ThumbnailCreateBootstrap = z.infer<typeof ThumbnailCreateBootstrapSchema>;
export type UpsertThumbnailDraftRequest = z.infer<typeof UpsertThumbnailDraftRequestSchema>;
export type CreateThumbnailJobRequest = z.infer<typeof CreateThumbnailJobRequestSchema>;
export type ThumbnailGenerationJob = z.infer<typeof ThumbnailGenerationJobSchema>;
