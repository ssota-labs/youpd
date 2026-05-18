import { z } from 'zod';
import {
  getHarvestRow,
  markHarvestItemsPublished,
} from '@youpd/supabase/repositories/harvests';
import { HarvestNotFoundError } from './errors';

export const MarkHarvestPublishedInputSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            kind: z.enum(['video', 'channel']),
            id: z.string().min(1).max(64),
            notion_page_id: z.string().min(1).max(64),
          })
          .strict(),
      )
      .min(1)
      .max(200),
  })
  .strict();

export type MarkHarvestPublishedInput = z.infer<
  typeof MarkHarvestPublishedInputSchema
>;

/**
 * Persist Notion page ids onto canonical videos/channels and flip each
 * junction's `notion_relation_synced` to true in one transaction. Safe to
 * retry: re-marking a row is a no-op update.
 */
export async function markHarvestPublished(
  harvestId: string,
  input: MarkHarvestPublishedInput,
): Promise<{ harvest_id: string; updated: number }> {
  const harvest = await getHarvestRow(harvestId);
  if (!harvest) throw new HarvestNotFoundError(harvestId);
  await markHarvestItemsPublished(
    harvestId,
    input.items.map((i) => ({
      kind: i.kind,
      id: i.id,
      notionPageId: i.notion_page_id,
    })),
  );
  return { harvest_id: harvestId, updated: input.items.length };
}
