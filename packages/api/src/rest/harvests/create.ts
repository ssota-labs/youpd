import { z } from 'zod';
import {
  searchKeyword,
  SearchKeywordInputSchema,
} from '../../mcp/tools/search-keyword';
import {
  upsertChannels,
  upsertVideos,
  type UpsertChannelInput,
  type UpsertVideoInput,
} from '@youpd/supabase/repositories/youtube';
import {
  createHarvest as repoCreateHarvest,
  linkHarvestChannels,
  linkHarvestVideos,
} from '@youpd/supabase/repositories/harvests';

export const CreateHarvestInputSchema = z
  .object({
    keyword: z.string().min(1).max(200),
    keyword_idea_page_id: z.string().min(1).max(64),
    results_per_keyword: z.number().int().min(1).max(500).default(300),
  })
  .strict();

export type CreateHarvestInput = z.infer<typeof CreateHarvestInputSchema>;

export type CreateHarvestOutput = {
  harvest_id: string;
  keyword: string;
  total_videos: number;
  total_channels: number;
  units_consumed: number;
  search_pages: number | undefined;
  quota_session_id: string | undefined;
};

function toDateOrNull(iso: string): Date | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Date(t);
}

/**
 * Run a paginated YouTube keyword search and stage every result in Supabase:
 *
 * 1. `searchKeyword()` fetches up to `results_per_keyword` videos and their
 *    parent channels in a single quota-gated call (already deduped).
 * 2. Canonical `channels` and `videos` rows are upserted first; `videos`
 *    references `channels`, so channels must land before videos can FK.
 * 3. `search_harvests` records the cycle. Junction tables link each video
 *    (with its rank) and channel to this harvest. `notion_relation_synced`
 *    starts false so the publish tool can drain them.
 *
 * The harvest row is returned in `status='fetched'`. The publish tool flips
 * it to `publishing` on first invocation via `setHarvestPublishing`.
 */
export async function createHarvest(
  input: CreateHarvestInput,
): Promise<CreateHarvestOutput> {
  const search = await searchKeyword(
    SearchKeywordInputSchema.parse({
      keyword: input.keyword,
      max_results: 50,
      max_total_results: input.results_per_keyword,
    }),
  );

  const channelInputs: UpsertChannelInput[] = search.channels.map((c) => ({
    channelId: c.channelId,
    title: c.title || null,
    subscriberCount: c.subscriberCount,
    viewCount: c.viewCount,
    videoCount: c.videoCount,
    publishedAt: toDateOrNull(c.publishedAt),
    url: c.url || null,
  }));

  const videoInputs: UpsertVideoInput[] = search.videos.map((v) => ({
    videoId: v.videoId,
    channelId: v.channelId,
    title: v.title || null,
    views: v.views,
    likes: v.likes,
    comments: v.comments,
    durationSec: v.durationSeconds,
    publishedAt: toDateOrNull(v.publishedAt),
    url: v.url || null,
  }));

  // Channels first because videos.channel_id FKs into channels.channel_id.
  await upsertChannels(channelInputs);
  await upsertVideos(videoInputs);

  const harvest = await repoCreateHarvest({
    keywordIdeaPageId: input.keyword_idea_page_id,
    keyword: input.keyword,
    searchSessionId: search.quota_session_id ?? null,
    totalVideos: search.videos.length,
    totalChannels: search.channels.length,
  });

  await linkHarvestChannels(
    harvest.id,
    Array.from(new Set(search.channels.map((c) => c.channelId))),
  );
  await linkHarvestVideos(
    harvest.id,
    search.videos.map((v, idx) => ({ videoId: v.videoId, position: idx })),
  );

  return {
    harvest_id: harvest.id,
    keyword: harvest.keyword,
    total_videos: harvest.totalVideos,
    total_channels: harvest.totalChannels,
    units_consumed: search.units_consumed,
    search_pages: search.search_pages,
    quota_session_id: search.quota_session_id,
  };
}
