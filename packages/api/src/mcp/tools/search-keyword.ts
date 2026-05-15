import { z } from 'zod';
import {
  channelsList,
  normaliseChannel,
  normaliseVideo,
  searchList,
  UNIT_COST,
  type ChannelSummary,
  type VideoSummary,
  videosList,
  type YouTubeClient,
} from '@youpd/youtube';
import { getYouTubeClient } from '../youtube-client';
import { runWithBudget, attachQuotaSession } from '../quota';

export const SearchKeywordInputSchema = z
  .object({
    keyword: z.string().min(1).max(200),
    max_results: z.number().int().min(1).max(50).default(50),
    region_code: z.string().length(2).optional(),
    order: z
      .enum(['date', 'rating', 'relevance', 'title', 'videoCount', 'viewCount'])
      .default('relevance'),
  })
  .strict();
export type SearchKeywordInput = z.infer<typeof SearchKeywordInputSchema>;

export const SearchKeywordOutputSchema = z.object({
  keyword: z.string(),
  videos: z.array(z.unknown()),
  channels: z.array(z.unknown()),
  units_consumed: z.number().int().nonnegative(),
  quota_session_id: z.string().optional(),
});

export type SearchKeywordOutput = {
  keyword: string;
  videos: VideoSummary[];
  channels: ChannelSummary[];
  units_consumed: number;
  quota_session_id?: string;
};

const SEARCH_UNITS = UNIT_COST.search_list;
const VIDEOS_UNITS = UNIT_COST.videos_list;
const CHANNELS_UNITS = UNIT_COST.channels_list;

export async function searchKeyword(
  input: SearchKeywordInput,
  client: YouTubeClient = getYouTubeClient(),
): Promise<SearchKeywordOutput> {
  // 1 search.list (100u) + 1 videos.list batch (1u) + 1 channels.list batch (1u)
  // = 102u worst case for max_results <= 50.
  const totalUnits = SEARCH_UNITS + VIDEOS_UNITS + CHANNELS_UNITS;

  const { result, sessionId } = await runWithBudget<SearchKeywordOutput>({
    operation: 'video-search',
    units: totalUnits,
    keyword: input.keyword,
    call: async () => {
      const search = await searchList(client, {
        q: input.keyword,
        maxResults: input.max_results,
        order: input.order,
        regionCode: input.region_code,
        type: 'video',
      });

      const videoIds = search.items
        .map((item) => item.id?.videoId)
        .filter((s): s is string => typeof s === 'string' && s.length > 0);

      if (videoIds.length === 0) {
        const payload: SearchKeywordOutput = {
          keyword: input.keyword,
          videos: [],
          channels: [],
          units_consumed: SEARCH_UNITS,
        };
        return { resultCount: 0, payload };
      }

      const videosRes = await videosList(client, { ids: videoIds });
      const videos = videosRes.items.map(normaliseVideo);

      const channelIds = Array.from(
        new Set(videos.map((v) => v.channelId).filter((s) => s.length > 0)),
      );
      const channelsRes = channelIds.length
        ? await channelsList(client, { ids: channelIds })
        : { items: [], batches: 0 };
      const channels = channelsRes.items.map(normaliseChannel);

      const payload: SearchKeywordOutput = {
        keyword: input.keyword,
        videos,
        channels,
        units_consumed: totalUnits,
      };
      return { resultCount: videos.length, payload };
    },
  });

  return attachQuotaSession(result, sessionId);
}
