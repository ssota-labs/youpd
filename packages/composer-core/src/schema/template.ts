import { z } from 'zod';
import { CanvasSchema } from './canvas';
import { LayerSchema } from './layer';
import { BackgroundSchema } from './composition';

// Templates are pre-authored compositions with {placeholder} markers in
// text fields. applyTemplate (in ./template/apply.ts) substitutes fillers
// to produce a concrete Composition.
export const TemplateDocumentSchema = z
  .object({
    canvas: CanvasSchema,
    background: BackgroundSchema.optional(),
    layers: z.array(LayerSchema),
  })
  .strict();
export type TemplateDocument = z.infer<typeof TemplateDocumentSchema>;

export const FillersSchema = z.record(z.string(), z.string()).default({});
export type Fillers = z.infer<typeof FillersSchema>;

export const TemplateSchema = z
  .object({
    code: z.string().min(1).max(60),
    title: z.string().min(1).max(200),
    canvas: CanvasSchema,
    document: TemplateDocumentSchema,
    previewUrl: z.string().url().nullable().optional(),
    tags: z.array(z.string().max(40)).default([]),
    isPublic: z.boolean().default(true),
  })
  .strict();
export type Template = z.infer<typeof TemplateSchema>;
