import { z } from 'zod';

const baseLayer = {
  id: z.string().min(1).max(100),
  x: z.number().finite(),
  y: z.number().finite(),
  rotation: z.number().finite().optional(),
  opacity: z.number().min(0).max(1).optional(),
  visible: z.boolean().optional(),
};

export const TextLayerSchema = z
  .object({
    ...baseLayer,
    type: z.literal('text'),
    text: z.string().max(500),
    fontFamily: z.string().max(100).optional(),
    fontSize: z.number().positive().optional(),
    fontWeight: z.union([z.number().int(), z.string().max(20)]).optional(),
    fill: z.string().max(40).optional(),
    stroke: z.string().max(40).optional(),
    strokeWidth: z.number().nonnegative().optional(),
    align: z.enum(['left', 'center', 'right']).optional(),
    width: z.number().positive().optional(),
    lineHeight: z.number().positive().optional(),
    letterSpacing: z.number().finite().optional(),
  })
  .strict();
export type TextLayer = z.infer<typeof TextLayerSchema>;

export const ImageLayerSchema = z
  .object({
    ...baseLayer,
    type: z.literal('image'),
    src: z.string().url(),
    width: z.number().positive(),
    height: z.number().positive(),
    fit: z.enum(['cover', 'contain', 'fill']).optional(),
  })
  .strict();
export type ImageLayer = z.infer<typeof ImageLayerSchema>;

export const ShapeLayerSchema = z
  .object({
    ...baseLayer,
    type: z.literal('shape'),
    shape: z.enum(['rect', 'circle']),
    width: z.number().positive(),
    height: z.number().positive(),
    fill: z.string().max(40).optional(),
    stroke: z.string().max(40).optional(),
    strokeWidth: z.number().nonnegative().optional(),
    cornerRadius: z.number().nonnegative().optional(),
  })
  .strict();
export type ShapeLayer = z.infer<typeof ShapeLayerSchema>;

export const LayerSchema = z.discriminatedUnion('type', [
  TextLayerSchema,
  ImageLayerSchema,
  ShapeLayerSchema,
]);
export type Layer = z.infer<typeof LayerSchema>;
export type LayerType = Layer['type'];

// A patch is a partial overlay of any single layer's mutable fields; we
// re-validate the merged layer after applying. Splitting it from LayerSchema
// keeps the type the same regardless of which layer kind is being edited.
export const LayerPatchSchema = z
  .object({
    text: z.string().max(500).optional(),
    fontFamily: z.string().max(100).optional(),
    fontSize: z.number().positive().optional(),
    fontWeight: z.union([z.number().int(), z.string().max(20)]).optional(),
    fill: z.string().max(40).optional(),
    stroke: z.string().max(40).optional(),
    strokeWidth: z.number().nonnegative().optional(),
    align: z.enum(['left', 'center', 'right']).optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    lineHeight: z.number().positive().optional(),
    letterSpacing: z.number().finite().optional(),
    x: z.number().finite().optional(),
    y: z.number().finite().optional(),
    rotation: z.number().finite().optional(),
    opacity: z.number().min(0).max(1).optional(),
    visible: z.boolean().optional(),
    src: z.string().url().optional(),
    fit: z.enum(['cover', 'contain', 'fill']).optional(),
    cornerRadius: z.number().nonnegative().optional(),
  })
  .strict();
export type LayerPatch = z.infer<typeof LayerPatchSchema>;
