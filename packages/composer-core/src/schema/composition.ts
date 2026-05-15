import { z } from 'zod';
import { CanvasSchema } from './canvas';
import { LayerSchema } from './layer';

export const BackgroundSchema = z
  .object({
    color: z.string().max(40).optional(),
    imageUrl: z.string().url().optional(),
  })
  .strict();
export type Background = z.infer<typeof BackgroundSchema>;

// The top-level shape stored per design row. Profiles narrow what's allowed
// (canvas presets, layer types) but the core schema stays the same so any
// host can persist and render any Composition.
export const CompositionSchema = z
  .object({
    canvas: CanvasSchema,
    background: BackgroundSchema.optional(),
    layers: z.array(LayerSchema),
  })
  .strict();
export type Composition = z.infer<typeof CompositionSchema>;
