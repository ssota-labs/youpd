import { z } from 'zod';
import {
  finalizeHarvest as repoFinalize,
  getHarvestStatus,
} from '@youpd/supabase/repositories/harvests';
import { HarvestNotFoundError } from './errors';

export const FinalizeHarvestInputSchema = z
  .object({
    notion_keyword_page_id: z.string().min(1).max(64),
  })
  .strict();

export type FinalizeHarvestInput = z.infer<typeof FinalizeHarvestInputSchema>;

export class HarvestNotReadyError extends Error {
  override readonly name = 'HarvestNotReadyError';
  constructor(
    public readonly harvestId: string,
    public readonly unpublishedVideos: number,
    public readonly unpublishedChannels: number,
  ) {
    super(
      `harvest ${harvestId} still has ${unpublishedVideos} videos / ` +
        `${unpublishedChannels} channels unpublished`,
    );
  }
}

/**
 * Mark the harvest fully published. Caller must have:
 *   - synced every junction row (no `notion_relation_synced = false` left)
 *   - merged Keywords-DB relations in Notion for this keyword
 *   - upserted the Keywords-DB row and is now passing its page id back here
 *
 * Idempotent: a second call after the row is already `published` is a no-op
 * update (status/finalized/finished_at converge on the same values).
 */
export async function finalizeHarvest(
  harvestId: string,
  input: FinalizeHarvestInput,
): Promise<{ harvest_id: string; finalized: true }> {
  const status = await getHarvestStatus(harvestId);
  if (!status) throw new HarvestNotFoundError(harvestId);
  if (
    !status.finalized &&
    (status.unpublishedVideos > 0 || status.unpublishedChannels > 0)
  ) {
    throw new HarvestNotReadyError(
      harvestId,
      status.unpublishedVideos,
      status.unpublishedChannels,
    );
  }
  await repoFinalize(harvestId, input.notion_keyword_page_id);
  return { harvest_id: harvestId, finalized: true };
}
