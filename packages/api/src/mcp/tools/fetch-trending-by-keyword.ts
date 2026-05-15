import { z } from 'zod';
import {
  channelsList,
  normaliseChannel,
  normaliseVideo,
  searchList,
  UNIT_COST,
  videosList,
  type ChannelSummary,
  type VideoSummary,
  type YouTubeClient,
} from '@youpd/youtube';
import { getYouTubeClient } from '../youtube-client';
import { attachQuotaSession, runWithBudget } from '../quota';

export const FetchTrendingByKeywordInputSchema = z
  .object({
    keyword: z.string().min(1).max(200),
    hours: z.number().int().min(1).max(72).default(24),
    max_results: z.number().int().min(1).max(50).default(50),
    region_code: z.string().length(2).optional(),
  })
  .strict();
export type FetchTrendingByKeywordInput = z.infer<
  typeof FetchTrendingByKeywordInputSchema
>;

export type FetchTrendingByKeywordOutput = {
  keyword: string;
  published_after: string;
  source: 'search.recent24h';
  videos: VideoSummary[];
  channels: ChannelSummary[];
  units_consumed: number;
  quota_session_id?: string;
};

// search.list?publishedAfter=<now-Nh>&order=viewCount captures fast-rising
// videos within the requested window. 100u + 1u + 1u = 102u — same shape as
// search_keyword but with the time window filter.
export async function fetchTrendingByKeyword(
  input: FetchTrendingByKeywordInput,
  client: YouTubeClient = getYouTubeClient(),
): Promise<FetchTrendingByKeywordOutput> {
  const totalUnits =
    UNIT_COST.search_list + UNIT_COST.videos_list + UNIT_COST.channels_list;

  const publishedAfter = new Date(
    Date.now() - input.hours * 60 * 60 * 1000,
  ).toISOString();

  const { result, sessionId } = await runWithBudget<FetchTrendingByKeywordOutput>({
    operation: 'trending-keyword',
    units: totalUnits,
    keyword: input.keyword,
    call: async () => {
      const search = await searchList(client, {
        q: input.keyword,
        type: 'video',
        order: 'viewCount',
        publishedAfter,
        regionCode: input.region_code,
        maxResults: input.max_results,
      });

      const videoIds = search.items
        .map((item) => item.id?.videoId)
        .filter((s): s is string => typeof s === 'string' && s.length > 0);

      if (videoIds.length === 0) {
        const payload: FetchTrendingByKeywordOutput = {
          keyword: input.keyword,
          published_after: publishedAfter,
          source: 'search.recent24h',
          videos: [],
          channels: [],
          units_consumed: UNIT_COST.search_list,
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

      const payload: FetchTrendingByKeywordOutput = {
        keyword: input.keyword,
        published_after: publishedAfter,
        source: 'search.recent24h',
        videos,
        channels,
        units_consumed: totalUnits,
      };
      return { resultCount: videos.length, payload };
    },
  });

  return attachQuotaSession(result, sessionId);
}
