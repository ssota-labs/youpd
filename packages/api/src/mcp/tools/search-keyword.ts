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
import { persistKeywordHarvest } from '@youpd/supabase/repositories/youtube';
import { getYouTubeClient } from '../youtube-client';
import { runWithBudget, attachQuotaSession } from '../quota';

export const SearchKeywordInputSchema = z
  .object({
    keyword: z.string().min(1).max(200),
    /** Per search.list request (max 50). */
    max_results: z.number().int().min(1).max(50).default(50),
    /**
     * When set, follow search.list nextPageToken until this many videos are
     * collected or YouTube returns no further pages (max 500 total).
     * When omitted, only the first page is fetched (size = max_results).
     */
    max_total_results: z.number().int().min(1).max(500).optional(),
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
  search_pages: z.number().int().nonnegative().optional(),
});

export type SearchKeywordOutput = {
  keyword: string;
  videos: VideoSummary[];
  channels: ChannelSummary[];
  units_consumed: number;
  quota_session_id?: string;
  search_pages?: number;
};

const SEARCH_UNITS = UNIT_COST.search_list;
const VIDEOS_UNITS = UNIT_COST.videos_list;
const CHANNELS_UNITS = UNIT_COST.channels_list;

export async function searchKeyword(
  input: SearchKeywordInput,
  client: YouTubeClient = getYouTubeClient(),
): Promise<SearchKeywordOutput> {
  const totalCap =
    input.max_total_results ?? input.max_results;
  const pageSize = input.max_results;

  const perPage = Math.min(pageSize, 50);
  const maxPages = Math.ceil(totalCap / perPage);
  const upperBoundUnits =
    maxPages * (SEARCH_UNITS + VIDEOS_UNITS) +
    Math.ceil(totalCap / 50) * CHANNELS_UNITS;

  const { result, sessionId } = await runWithBudget<SearchKeywordOutput>({
    operation: 'video-search',
    units: upperBoundUnits,
    keyword: input.keyword,
    call: async () => {
      let pageToken: string | undefined;
      const allVideos: VideoSummary[] = [];
      let searchPages = 0;
      let consumed = 0;

      while (allVideos.length < totalCap) {
        const remaining = totalCap - allVideos.length;
        const batchSize = Math.min(perPage, remaining);
        const search = await searchList(client, {
          q: input.keyword,
          maxResults: batchSize,
          order: input.order,
          regionCode: input.region_code,
          type: 'video',
          pageToken,
        });
        searchPages += 1;
        consumed += SEARCH_UNITS;

        const videoIds = search.items
          .map((item) => item.id?.videoId)
          .filter((s): s is string => typeof s === 'string' && s.length > 0);

        if (videoIds.length === 0) {
          break;
        }

        const videosRes = await videosList(client, { ids: videoIds });
        consumed += VIDEOS_UNITS;
        const pageVideos = videosRes.items.map(normaliseVideo);
        for (const v of pageVideos) {
          if (allVideos.length < totalCap) allVideos.push(v);
        }

        if (!search.nextPageToken) break;
        if (allVideos.length >= totalCap) break;
        pageToken = search.nextPageToken;
      }

      if (allVideos.length === 0) {
        const payload: SearchKeywordOutput = {
          keyword: input.keyword,
          videos: [],
          channels: [],
          units_consumed: consumed || SEARCH_UNITS,
          search_pages: searchPages,
        };
        return { resultCount: 0, payload };
      }

      const channelIds = Array.from(
        new Set(allVideos.map((v) => v.channelId).filter((s) => s.length > 0)),
      );
      const channelsRes = channelIds.length
        ? await channelsList(client, { ids: channelIds })
        : { items: [], batches: 0 };
      consumed += channelsRes.batches * CHANNELS_UNITS;
      const channels = channelsRes.items.map(normaliseChannel);

      const payload: SearchKeywordOutput = {
        keyword: input.keyword,
        videos: allVideos,
        channels,
        units_consumed: consumed,
        search_pages: searchPages,
      };
      return { resultCount: allVideos.length, payload };
    },
  });

  await persistKeywordSearchResult(result, sessionId);
  return attachQuotaSession(result, sessionId);
}

async function persistKeywordSearchResult(
  result: SearchKeywordOutput,
  sessionId: string | null,
): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    await persistKeywordHarvest({
      keyword: result.keyword,
      quotaSessionId: sessionId,
      channels: result.channels.map((channel) => ({
        channelId: channel.channelId,
        title: channel.title,
        description: channel.description,
        thumbnails: channel.thumbnails,
        subscriberCount: channel.subscriberCount,
        viewCount: channel.viewCount,
        videoCount: channel.videoCount,
        hiddenSubscriberCount: channel.hiddenSubscriberCount,
        uploadsPlaylistId: channel.uploadsPlaylistId,
        country: channel.country,
        url: channel.url,
        publishedAt: channel.publishedAt,
      })),
      videos: result.videos.map((video) => ({
        videoId: video.videoId,
        channelId: video.channelId,
        title: video.title,
        description: video.description,
        thumbnails: video.thumbnails,
        durationSeconds: video.durationSeconds,
        views: video.views,
        likes: video.likes,
        comments: video.comments,
        tags: video.tags,
        categoryId: video.categoryId,
        defaultAudioLanguage: video.defaultAudioLanguage,
        url: video.url,
        publishedAt: video.publishedAt,
      })),
    });
  } catch (err) {
    console.warn('[youpd] failed to persist keyword harvest', err);
  }
}
