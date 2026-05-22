import { z } from 'zod';
import {
  normaliseVideo,
  UNIT_COST,
  videosList,
  type VideoSummary,
  type YouTubeClient,
} from '@youpd/youtube';
import {
  upsertChannels,
  upsertVideos,
  upsertHotVideos,
} from '@youpd/supabase/repositories/youtube';
import { executeWithKeyRotation } from '../youtube-key-pool';
import { attachQuotaSession, runWithBudget } from '../quota';

export const FetchHotChartInputSchema = z
  .object({
    region_code: z.string().length(2).default('KR'),
    category_id: z.string().optional(),
    limit: z.number().int().min(1).max(50).default(50),
    /** When false, only calls YouTube; persistence is the caller's job (e.g. foundation harvest). */
    persist: z.boolean().default(true),
  })
  .strict();
export type FetchHotChartInput = z.infer<typeof FetchHotChartInputSchema>;

export type FetchHotChartOutput = {
  region_code: string;
  category_id: string | null;
  fetched_at: string;
  source: 'chart=mostPopular';
  videos: VideoSummary[];
  units_consumed: number;
  quota_session_id?: string;
};

// videos.list?chart=mostPopular is 1 unit. The result is YouTube's "trending"
// chart for the region (+ optional category). Agent decides whether each
// entry seeds Hot Video Daily and/or which title patterns to extract.
function dateOrNull(iso: string): Date | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : new Date(t);
}

export async function fetchHotChart(
  input: FetchHotChartInput,
  injectedClient?: YouTubeClient,
): Promise<FetchHotChartOutput> {
  const parsed = FetchHotChartInputSchema.parse(input);
  const totalUnits = UNIT_COST.videos_list;

  return executeWithKeyRotation(
    injectedClient ?? null,
    async (client, keyId) => {
      const { result, sessionId } = await runWithBudget<FetchHotChartOutput>({
        operation: 'hot-chart',
        units: totalUnits,
        keyId,
        call: async () => {
          const res = await videosList(client, {
            chart: 'mostPopular',
            regionCode: parsed.region_code,
            videoCategoryId: parsed.category_id,
            maxResults: parsed.limit,
          });
          const videos = res.items.map(normaliseVideo);
          const payload: FetchHotChartOutput = {
            region_code: parsed.region_code,
            category_id: parsed.category_id ?? null,
            fetched_at: new Date().toISOString(),
            source: 'chart=mostPopular',
            videos,
            units_consumed: totalUnits,
          };
          return { resultCount: videos.length, payload };
        },
      });

      if (parsed.persist) {
        await persistHotChartResult(result);
      }
      return attachQuotaSession(result, sessionId);
    },
  );
}

async function persistHotChartResult(result: FetchHotChartOutput): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const hotDate = result.fetched_at.slice(0, 10);
  try {
    const firstByChannel = new Map<string, VideoSummary>();
    for (const video of result.videos) {
      if (!firstByChannel.has(video.channelId)) firstByChannel.set(video.channelId, video);
    }
    await upsertChannels(
      [...firstByChannel.values()].map((video) => ({
        channelId: video.channelId,
        title: video.channelTitle,
        subscriberCount: null,
        viewCount: null,
        videoCount: null,
        url: `https://www.youtube.com/channel/${encodeURIComponent(video.channelId)}`,
        publishedAt: null,
      })),
    );
    await upsertVideos(
      result.videos.map((video) => ({
        videoId: video.videoId,
        channelId: video.channelId,
        title: video.title,
        durationSec: video.durationSeconds,
        views: video.views,
        likes: video.likes,
        comments: video.comments,
        url: video.url,
        publishedAt: dateOrNull(video.publishedAt),
      })),
    );
    await upsertHotVideos(
      result.videos.map((video, index) => ({
        hotDate,
        videoId: video.videoId,
        source: result.source,
        regionCode: result.region_code,
        categoryId: result.category_id,
        chartRank: index + 1,
      })),
    );
  } catch (err) {
    console.warn('[youpd] failed to persist hot chart', err);
  }
}
