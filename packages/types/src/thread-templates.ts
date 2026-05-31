import { z } from 'zod';
import { CreativeTemplateSlotSchemaJson } from './creative-templates';
import { SocialPostLineageSchema } from './social-posts';

export const ThreadStructureTypeSchema = z.enum([
  'contrarian_take',
  'teardown',
  'lesson',
  'listicle',
  'case_study',
  'story_arc',
  'tactical_checklist',
  'myth_bust',
]);

export const ThreadStructureSlotCodeSchema = z.enum([
  'hook',
  'context',
  'tension',
  'insight',
  'proof',
  'tactical_step',
  'cta',
  'bridge',
]);

export const ThreadStructureSlotsSchema = z.object({
  hook: z.string().max(500).optional(),
  context: z.string().max(1000).optional(),
  tension: z.string().max(1000).optional(),
  insight: z.string().max(1000).optional(),
  proof: z.string().max(1000).optional(),
  tacticalStep: z.string().max(1000).optional(),
  cta: z.string().max(500).optional(),
  bridge: z.string().max(300).optional(),
  notes: z.string().optional(),
});

export const ThreadSkeletonSchema = z.object({
  version: z.literal(1),
  slotOrder: z.array(ThreadStructureSlotCodeSchema).min(1),
  postCountHint: z.number().int().min(1).max(25).default(7),
  locale: z.enum(['ko', 'en', 'mixed']).default('ko'),
});

export const ThreadTemplateDefaultStyleSchema = z.object({
  structureType: ThreadStructureTypeSchema.optional(),
  hookStyle: z.string().optional(),
  tone: z.string().optional(),
  locale: z.enum(['ko', 'en', 'mixed']).optional(),
});

export const ThreadStructureEvidenceSourceModeSchema = z.enum([
  'extracted',
  'manual',
  'imported_seed',
]);

export const ThreadGenerationLineageSchema = z.object({
  threadTemplateId: z.string().uuid(),
  sourceEvidenceIds: z.array(z.string().uuid()).default([]),
  sourceSocialPostIds: z.array(z.string().uuid()).default([]),
  promptVersion: z.literal('thread_gen_v1'),
  generator: z.enum(['llm', 'deterministic', 'manual_compose']),
  sourceMode: ThreadStructureEvidenceSourceModeSchema.optional(),
});

export const ThreadTemplateCategorySchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  templateCount: z.number().int(),
});

export const ThreadTemplateTagSchema = z.object({
  code: z.string(),
  name: z.string(),
  kind: z.string(),
  templateCount: z.number().int(),
});

export const ThreadTemplateCardSchema = z.object({
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
  structureType: ThreadStructureTypeSchema.nullable(),
  hookStyle: z.string().nullable(),
  slotOrderPreview: z.array(ThreadStructureSlotCodeSchema),
});

export const ThreadTemplateDetailSchema = ThreadTemplateCardSchema.extend({
  useWhen: z.string(),
  skeleton: ThreadSkeletonSchema,
  slotSchema: CreativeTemplateSlotSchemaJson,
  defaultStyle: ThreadTemplateDefaultStyleSchema.nullable(),
  examples: z.array(
    z.object({
      label: z.string(),
      filledThreadText: z.string(),
      slotValues: z.record(z.string(), z.string()),
      partCount: z.number().int().nullable(),
    }),
  ),
  evidence: z.array(
    z.object({
      evidenceId: z.string().uuid(),
      socialPostId: z.string().uuid(),
      authorHandle: z.string(),
      permalink: z.string(),
      excerptText: z.string(),
      structureType: ThreadStructureTypeSchema,
      hookStyle: z.string().nullable(),
      sourceMode: ThreadStructureEvidenceSourceModeSchema,
      structureSlots: ThreadStructureSlotsSchema,
      lineage: SocialPostLineageSchema.nullable(),
      evidenceNote: z.string().nullable(),
    }),
  ),
});

export const ThreadTemplateListQuerySchema = z.object({
  category: z.string().optional(),
  tag: z.string().optional(),
  q: z.string().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(48).optional(),
});

export const ThreadTemplateListResponseSchema = z.object({
  templates: z.array(ThreadTemplateCardSchema),
  nextCursor: z.string().uuid().nullable(),
});

export const ThreadGenerateRequestSchema = z.object({
  topic: z.string().min(1).max(4000),
  audience: z.string().max(500).optional(),
  contextNotes: z.string().max(4000).optional(),
  locale: z.enum(['ko', 'en', 'mixed']).optional(),
});

export const ThreadGenerateResponseSchema = z.object({
  jobId: z.string().uuid(),
  status: z.enum(['queued', 'running', 'succeeded', 'failed']),
  draftText: z.string().nullable(),
  parts: z
    .array(
      z.object({
        index: z.number().int(),
        text: z.string(),
      }),
    )
    .nullable(),
  lineage: ThreadGenerationLineageSchema,
});

export const CreateThreadStructureEvidenceBodySchema = z.object({
  manual: z.boolean().optional(),
  structureType: ThreadStructureTypeSchema.optional(),
  hookStyle: z.string().optional(),
  manualStructureNotes: ThreadStructureSlotsSchema.optional(),
});

export const ThreadStructureEvidenceSummarySchema = z.object({
  id: z.string().uuid(),
  socialPostId: z.string().uuid(),
  structureType: ThreadStructureTypeSchema,
  hookStyle: z.string().nullable(),
  sourceMode: ThreadStructureEvidenceSourceModeSchema,
  structureExtractor: z.string(),
  structureSlots: ThreadStructureSlotsSchema,
  manualStructureNotes: ThreadStructureSlotsSchema.nullable(),
});

export type ThreadStructureType = z.infer<typeof ThreadStructureTypeSchema>;
export type ThreadStructureSlotCode = z.infer<typeof ThreadStructureSlotCodeSchema>;
export type ThreadStructureSlots = z.infer<typeof ThreadStructureSlotsSchema>;
export type ThreadSkeleton = z.infer<typeof ThreadSkeletonSchema>;
export type ThreadTemplateCard = z.infer<typeof ThreadTemplateCardSchema>;
export type ThreadTemplateDetail = z.infer<typeof ThreadTemplateDetailSchema>;
export type ThreadTemplateCategory = z.infer<typeof ThreadTemplateCategorySchema>;
export type ThreadTemplateTag = z.infer<typeof ThreadTemplateTagSchema>;
export type ThreadTemplateListQuery = z.infer<typeof ThreadTemplateListQuerySchema>;
export type ThreadGenerateRequest = z.infer<typeof ThreadGenerateRequestSchema>;
export type ThreadGenerateResponse = z.infer<typeof ThreadGenerateResponseSchema>;
export type ThreadStructureEvidenceSummary = z.infer<
  typeof ThreadStructureEvidenceSummarySchema
>;
