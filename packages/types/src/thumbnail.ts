import { z } from 'zod';

export const AspectSchema = z.enum(['16:9', '9:16']);
export type Aspect = z.infer<typeof AspectSchema>;

export const ASPECT_DIMENSIONS: Record<Aspect, { width: number; height: number }> = {
  '16:9': { width: 1280, height: 720 },
  '9:16': { width: 720, height: 1280 },
};

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

export const BackgroundSchema = z
  .object({
    color: z.string().max(40).optional(),
    imageUrl: z.string().url().optional(),
  })
  .strict();
export type Background = z.infer<typeof BackgroundSchema>;

export const ThumbnailDocumentSchema = z
  .object({
    aspect: AspectSchema,
    background: BackgroundSchema.optional(),
    layers: z.array(LayerSchema),
  })
  .strict();
export type ThumbnailDocument = z.infer<typeof ThumbnailDocumentSchema>;

// patch must be a partial of any layer; we re-validate after merge.
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
