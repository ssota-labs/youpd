import { z } from 'zod';
import { LayerSchema, type Layer } from '@youpd/types';
import {
  getThumbnail,
  updateThumbnailLayers,
} from '@youpd/supabase/repositories/thumbnails';
import { broadcastThumbnailPatched } from '@youpd/supabase/realtime/thumbnail-channel';

export const ThumbnailReorderLayersInputSchema = z
  .object({
    thumbnailId: z.string().uuid(),
    // New ordering — must contain every existing layerId exactly once.
    layerIds: z.array(z.string().min(1).max(100)).min(1),
    expectedVersion: z.number().int().positive().optional(),
    updatedBy: z.string().max(200).optional(),
    source: z.enum(['agent', 'iframe']).default('agent'),
  })
  .strict();
export type ThumbnailReorderLayersInput = z.infer<
  typeof ThumbnailReorderLayersInputSchema
>;

export type ThumbnailReorderLayersOutput = {
  thumbnailId: string;
  version: number;
  order: string[];
};

export class InvalidLayerOrderError extends Error {
  override readonly name = 'InvalidLayerOrderError';
}

export async function thumbnailReorderLayers(
  input: ThumbnailReorderLayersInput,
): Promise<ThumbnailReorderLayersOutput> {
  const row = await getThumbnail(input.thumbnailId);
  const layers = z.array(LayerSchema).parse(row.layers) as Layer[];

  const existing = new Set(layers.map((l) => l.id));
  const wanted = new Set(input.layerIds);
  if (
    existing.size !== wanted.size ||
    [...existing].some((id) => !wanted.has(id)) ||
    input.layerIds.length !== layers.length
  ) {
    throw new InvalidLayerOrderError(
      `layerIds must match existing layers exactly`,
    );
  }

  const byId = new Map(layers.map((l) => [l.id, l] as const));
  const next = input.layerIds.map((id) => byId.get(id)!);

  const updated = await updateThumbnailLayers({
    id: row.id,
    expectedVersion: input.expectedVersion ?? row.version,
    layers: next,
    updatedBy: input.updatedBy ?? input.source,
  });
  await broadcastThumbnailPatched({
    thumbnailId: updated.id,
    version: updated.version,
    source: input.source,
  });
  return {
    thumbnailId: updated.id,
    version: updated.version,
    order: input.layerIds,
  };
}
