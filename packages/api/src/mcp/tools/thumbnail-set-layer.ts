import { z } from 'zod';
import { LayerPatchSchema, LayerSchema, type Layer } from '@youpd/types';
import { applyLayerPatch } from '../../thumbnail/patch-layer';
import {
  getThumbnail,
  updateThumbnailLayers,
} from '@youpd/supabase/repositories/thumbnails';
import { broadcastThumbnailPatched } from '@youpd/supabase/realtime/thumbnail-channel';

export const ThumbnailSetLayerInputSchema = z
  .object({
    thumbnailId: z.string().uuid(),
    layerId: z.string().min(1).max(100),
    patch: LayerPatchSchema,
    expectedVersion: z.number().int().positive().optional(),
    updatedBy: z.string().max(200).optional(),
    source: z.enum(['agent', 'iframe']).default('agent'),
  })
  .strict();
export type ThumbnailSetLayerInput = z.infer<typeof ThumbnailSetLayerInputSchema>;

export type ThumbnailSetLayerOutput = {
  thumbnailId: string;
  version: number;
  updatedLayerId: string;
};

export async function thumbnailSetLayer(
  input: ThumbnailSetLayerInput,
): Promise<ThumbnailSetLayerOutput> {
  const row = await getThumbnail(input.thumbnailId);
  const layers = z.array(LayerSchema).parse(row.layers) as Layer[];
  const next = applyLayerPatch(layers, input.layerId, input.patch);
  const updated = await updateThumbnailLayers({
    id: row.id,
    expectedVersion: input.expectedVersion ?? row.version,
    layers: next,
    updatedBy: input.updatedBy ?? input.source,
  });
  await broadcastThumbnailPatched({
    thumbnailId: updated.id,
    version: updated.version,
    updatedLayerId: input.layerId,
    source: input.source,
  });
  return {
    thumbnailId: updated.id,
    version: updated.version,
    updatedLayerId: input.layerId,
  };
}
