import { z } from 'zod';
import {
  getHarvestRow,
  listSyncedPageIds,
  listUnpublishedHarvestChannels,
  listUnpublishedHarvestVideos,
  setHarvestPublishing,
} from '@youpd/supabase/repositories/harvests';
import { HarvestNotFoundError } from './errors';

export const ListHarvestItemsInputSchema = z
  .object({
    kind: z.enum(['video', 'channel']),
    size: z.number().int().min(1).max(100).default(30),
    /** When true, return all junctions including already-published rows. */
    include_published: z.boolean().default(false),
  })
  .strict();

export type ListHarvestItemsInput = z.infer<typeof ListHarvestItemsInputSchema>;

export type HarvestVideoItemOut = {
  video_id: string;
  position: number;
  channel_id: string;
  title: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  duration_sec: number | null;
  published_at: string | null;
  url: string | null;
  notion_page_id: string | null;
};

export type HarvestChannelItemOut = {
  channel_id: string;
  title: string | null;
  subscriber_count: number | null;
  view_count: number | null;
  video_count: number | null;
  published_at: string | null;
  url: string | null;
  notion_page_id: string | null;
};

export type ListHarvestItemsOutput = {
  harvest_id: string;
  kind: 'video' | 'channel';
  videos?: HarvestVideoItemOut[];
  channels?: HarvestChannelItemOut[];
  // When include_published=true, these reflect the full set of synced page ids
  // (used by the worker at finalize-time to merge Keywords-DB relations).
  synced_video_page_ids?: string[];
  synced_channel_page_ids?: string[];
};

/**
 * Return the next batch of unpublished items for a harvest. The first call
 * advances the harvest from `fetched` → `publishing` (idempotent).
 *
 * When `include_published=true`, the returned list still respects `size` but
 * the response also includes the full set of already-synced Notion page ids
 * so the worker can call `mergeRelationPropertyByName` without a second
 * round-trip.
 */
export async function listHarvestItems(
  harvestId: string,
  input: ListHarvestItemsInput,
): Promise<ListHarvestItemsOutput> {
  const harvest = await getHarvestRow(harvestId);
  if (!harvest) throw new HarvestNotFoundError(harvestId);

  // Idempotent: only flips `fetched` → `publishing`.
  if (harvest.status === 'fetched') {
    await setHarvestPublishing(harvestId);
  }

  if (input.kind === 'video') {
    const rows = input.include_published
      ? []
      : await listUnpublishedHarvestVideos(harvestId, input.size);
    const out: HarvestVideoItemOut[] = rows.map((r) => ({
      video_id: r.videoId,
      position: r.position,
      channel_id: r.channelId,
      title: r.title,
      views: r.views,
      likes: r.likes,
      comments: r.comments,
      duration_sec: r.durationSec,
      published_at: r.publishedAt ? r.publishedAt.toISOString() : null,
      url: r.url,
      notion_page_id: r.notionPageId,
    }));
    const result: ListHarvestItemsOutput = {
      harvest_id: harvestId,
      kind: 'video',
      videos: out,
    };
    if (input.include_published) {
      const synced = await listSyncedPageIds(harvestId);
      result.synced_video_page_ids = synced.videoPageIds;
      result.synced_channel_page_ids = synced.channelPageIds;
    }
    return result;
  }

  const rows = input.include_published
    ? []
    : await listUnpublishedHarvestChannels(harvestId, input.size);
  const out: HarvestChannelItemOut[] = rows.map((r) => ({
    channel_id: r.channelId,
    title: r.title,
    subscriber_count: r.subscriberCount,
    view_count: r.viewCount,
    video_count: r.videoCount,
    published_at: r.publishedAt ? r.publishedAt.toISOString() : null,
    url: r.url,
    notion_page_id: r.notionPageId,
  }));
  const result: ListHarvestItemsOutput = {
    harvest_id: harvestId,
    kind: 'channel',
    channels: out,
  };
  if (input.include_published) {
    const synced = await listSyncedPageIds(harvestId);
    result.synced_video_page_ids = synced.videoPageIds;
    result.synced_channel_page_ids = synced.channelPageIds;
  }
  return result;
}
