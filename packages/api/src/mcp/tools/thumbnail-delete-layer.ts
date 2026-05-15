import { z } from 'zod';
import { LayerSchema, type Layer } from '@youpd/types';
import {
  getThumbnail,
  updateThumbnailLayers,
} from '@youpd/supabase/repositories/thumbnails';
import { broadcastThumbnailPatched } from '@youpd/supabase/realtime/thumbnail-channel';
import { LayerNotFoundError } from '../../thumbnail/patch-layer';

export const ThumbnailDeleteLayerInputSchema = z
  .object({
    thumbnailId: z.string().uuid(),
    layerId: z.string().min(1).max(100),
    expectedVersion: z.number().int().positive().optional(),
    updatedBy: z.string().max(200).optional(),
    source: z.enum(['agent', 'iframe']).default('agent'),
  })
  .strict();
export type ThumbnailDeleteLayerInput = z.infer<
  typeof ThumbnailDeleteLayerInputSchema
>;

export type ThumbnailDeleteLayerOutput = {
  thumbnailId: string;
  version: number;
  deletedLayerId: string;
};

export async function thumbnailDeleteLayer(
  input: ThumbnailDeleteLayerInput,
): Promise<ThumbnailDeleteLayerOutput> {
  const row = await getThumbnail(input.thumbnailId);
  const layers = z.array(LayerSchema).parse(row.layers) as Layer[];
  const idx = layers.findIndex((l) => l.id === input.layerId);
  if (idx < 0) throw new LayerNotFoundError(input.layerId);
  const next = [...layers.slice(0, idx), ...layers.slice(idx + 1)];

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
    deletedLayerId: input.layerId,
  };
}
