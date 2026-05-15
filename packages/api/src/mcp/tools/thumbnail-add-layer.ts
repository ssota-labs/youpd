import { z } from 'zod';
import { LayerSchema, type Layer } from '@youpd/types';
import { addLayer } from '../../thumbnail/patch-layer';
import {
  getThumbnail,
  updateThumbnailLayers,
} from '@youpd/supabase/repositories/thumbnails';
import { broadcastThumbnailPatched } from '@youpd/supabase/realtime/thumbnail-channel';

export const ThumbnailAddLayerInputSchema = z
  .object({
    thumbnailId: z.string().uuid(),
    layer: LayerSchema,
    expectedVersion: z.number().int().positive().optional(),
    updatedBy: z.string().max(200).optional(),
    source: z.enum(['agent', 'iframe']).default('agent'),
  })
  .strict();
export type ThumbnailAddLayerInput = z.infer<typeof ThumbnailAddLayerInputSchema>;

export type ThumbnailAddLayerOutput = {
  thumbnailId: string;
  version: number;
  layerId: string;
};

export async function thumbnailAddLayer(
  input: ThumbnailAddLayerInput,
): Promise<ThumbnailAddLayerOutput> {
  const row = await getThumbnail(input.thumbnailId);
  const layers = z.array(LayerSchema).parse(row.layers) as Layer[];
  const next = addLayer(layers, input.layer);
  const updated = await updateThumbnailLayers({
    id: row.id,
    expectedVersion: input.expectedVersion ?? row.version,
    layers: next,
    updatedBy: input.updatedBy ?? input.source,
  });
  await broadcastThumbnailPatched({
    thumbnailId: updated.id,
    version: updated.version,
    updatedLayerId: input.layer.id,
    source: input.source,
  });
  return {
    thumbnailId: updated.id,
    version: updated.version,
    layerId: input.layer.id,
  };
}
