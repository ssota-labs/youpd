import { z } from 'zod';
import {
  getHistoryCounts,
  navigateHistory,
} from '@youpd/supabase/repositories/thumbnails';
import { broadcastThumbnailPatched } from '@youpd/supabase/realtime/thumbnail-channel';

export const ThumbnailUndoInputSchema = z
  .object({
    thumbnailId: z.string().uuid(),
    source: z.enum(['agent', 'iframe']).default('agent'),
  })
  .strict();
export type ThumbnailUndoInput = z.infer<typeof ThumbnailUndoInputSchema>;

export type ThumbnailHistoryStateOutput = {
  thumbnailId: string;
  version: number;
  canUndo: boolean;
  canRedo: boolean;
};

async function applyAndReport(
  thumbnailId: string,
  direction: 'undo' | 'redo',
  source: 'agent' | 'iframe',
): Promise<ThumbnailHistoryStateOutput> {
  const row = await navigateHistory(thumbnailId, direction);
  const counts = await getHistoryCounts(thumbnailId);
  await broadcastThumbnailPatched({
    thumbnailId: row.id,
    version: row.version,
    source,
  });
  return {
    thumbnailId: row.id,
    version: row.version,
    canUndo: counts.canUndo,
    canRedo: counts.canRedo,
  };
}

export async function thumbnailUndo(
  input: ThumbnailUndoInput,
): Promise<ThumbnailHistoryStateOutput> {
  return applyAndReport(input.thumbnailId, 'undo', input.source);
}

export const ThumbnailRedoInputSchema = ThumbnailUndoInputSchema;
export type ThumbnailRedoInput = ThumbnailUndoInput;

export async function thumbnailRedo(
  input: ThumbnailRedoInput,
): Promise<ThumbnailHistoryStateOutput> {
  return applyAndReport(input.thumbnailId, 'redo', input.source);
}

export const ThumbnailHistoryStateInputSchema = z
  .object({
    thumbnailId: z.string().uuid(),
  })
  .strict();
export type ThumbnailHistoryStateInput = z.infer<
  typeof ThumbnailHistoryStateInputSchema
>;

export async function thumbnailHistoryState(
  input: ThumbnailHistoryStateInput,
): Promise<{ thumbnailId: string; canUndo: boolean; canRedo: boolean }> {
  const counts = await getHistoryCounts(input.thumbnailId);
  return {
    thumbnailId: input.thumbnailId,
    canUndo: counts.canUndo,
    canRedo: counts.canRedo,
  };
}
