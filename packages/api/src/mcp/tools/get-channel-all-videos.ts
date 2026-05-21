import { z } from 'zod';
import {
  channelsList,
  normaliseChannel,
  normaliseVideo,
  playlistAllVideoIds,
  UNIT_COST,
  videosList,
  type ChannelSummary,
  type VideoSummary,
  type YouTubeClient,
} from '@youpd/youtube';
import { executeWithKeyRotation } from '../youtube-key-pool';
import { attachQuotaSession, runWithBudget } from '../quota';

export const GetChannelAllVideosInputSchema = z
  .object({
    channel_id: z.string().min(1).max(50),
    max_videos: z.number().int().min(1).max(10_000).default(500),
  })
  .strict();
export type GetChannelAllVideosInput = z.infer<typeof GetChannelAllVideosInputSchema>;

export type GetChannelAllVideosOutput = {
  channel: ChannelSummary | null;
  videos: VideoSummary[];
  pages_fetched: number;
  units_consumed: number;
  quota_session_id?: string;
};

// channels.list(1u) + playlistItems.list × ceil(N/50)(1u each) +
// videos.list × ceil(N/50)(1u each). For a 1000-video channel that's
// 1 + 20 + 20 = 41 units — vs search.list path which would be 1000u+.
// Budget is computed up-front from max_videos so the gate refuses early
// when the daily counter is too low.
export async function getChannelAllVideos(
  input: GetChannelAllVideosInput,
  injectedClient?: YouTubeClient,
): Promise<GetChannelAllVideosOutput> {
  const expectedPages = Math.ceil(input.max_videos / 50);
  const upperBoundUnits =
    UNIT_COST.channels_list +
    expectedPages * UNIT_COST.playlist_items_list +
    expectedPages * UNIT_COST.videos_list;

  return executeWithKeyRotation(injectedClient ?? null, async (client, keyId) => {
    const { result, sessionId } = await runWithBudget<GetChannelAllVideosOutput>({
      operation: 'channel-all-videos',
      units: upperBoundUnits,
      channelId: input.channel_id,
      keyId,
      call: async () => {
      const channelsRes = await channelsList(client, { ids: [input.channel_id] });
      const rawChannel = channelsRes.items[0];
      if (!rawChannel) {
        const payload: GetChannelAllVideosOutput = {
          channel: null,
          videos: [],
          pages_fetched: 0,
          units_consumed: UNIT_COST.channels_list,
        };
        return { resultCount: 0, payload };
      }
      const channel = normaliseChannel(rawChannel);
      if (!channel.uploadsPlaylistId) {
        const payload: GetChannelAllVideosOutput = {
          channel,
          videos: [],
          pages_fetched: 0,
          units_consumed: UNIT_COST.channels_list,
        };
        return { resultCount: 1, payload };
      }

      const { videoIds, pagesFetched } = await playlistAllVideoIds(
        client,
        channel.uploadsPlaylistId,
        input.max_videos,
      );

      let videos: VideoSummary[] = [];
      let videosBatches = 0;
      if (videoIds.length > 0) {
        const videosRes = await videosList(client, { ids: videoIds });
        videos = videosRes.items.map(normaliseVideo);
        videosBatches = videosRes.batches;
      }

      const actualUnits =
        UNIT_COST.channels_list +
        pagesFetched * UNIT_COST.playlist_items_list +
        videosBatches * UNIT_COST.videos_list;

      const payload: GetChannelAllVideosOutput = {
        channel,
        videos,
        pages_fetched: pagesFetched,
        units_consumed: actualUnits,
      };
      return { resultCount: videos.length + 1, payload };
    },
  });

  return attachQuotaSession(result, sessionId);
  });
}
