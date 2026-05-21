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

export const GetChannelOverviewInputSchema = z
  .object({
    channel_id: z.string().min(1).max(50),
    top_n: z.number().int().min(1).max(50).default(10),
  })
  .strict();
export type GetChannelOverviewInput = z.infer<typeof GetChannelOverviewInputSchema>;

export type GetChannelOverviewOutput = {
  channel: ChannelSummary | null;
  top_videos: VideoSummary[];
  units_consumed: number;
  quota_session_id?: string;
};

// channels.list(1u) + playlistItems.list(1u) over uploads playlist (first page
// only, capped at 50) + videos.list(1u) → sort by view count locally → TOP N.
// 3 units total — much cheaper than search.list (100u) for the same outcome.
export async function getChannelOverview(
  input: GetChannelOverviewInput,
  injectedClient?: YouTubeClient,
): Promise<GetChannelOverviewOutput> {
  const totalUnits =
    UNIT_COST.channels_list +
    UNIT_COST.playlist_items_list +
    UNIT_COST.videos_list;

  return executeWithKeyRotation(injectedClient ?? null, async (client, keyId) => {
    const { result, sessionId } = await runWithBudget<GetChannelOverviewOutput>({
      operation: 'channel-detail',
      units: totalUnits,
      channelId: input.channel_id,
      keyId,
      call: async () => {
      const channelsRes = await channelsList(client, { ids: [input.channel_id] });
      const rawChannel = channelsRes.items[0];
      if (!rawChannel) {
        const payload: GetChannelOverviewOutput = {
          channel: null,
          top_videos: [],
          units_consumed: UNIT_COST.channels_list,
        };
        return { resultCount: 0, payload };
      }
      const channel = normaliseChannel(rawChannel);

      if (!channel.uploadsPlaylistId) {
        const payload: GetChannelOverviewOutput = {
          channel,
          top_videos: [],
          units_consumed: UNIT_COST.channels_list,
        };
        return { resultCount: 1, payload };
      }

      // First page of uploads = the channel's 50 most recent videos. Sorting
      // that locally by views surfaces "popular among recent uploads", which
      // is what the agent's "channel analysis" skill wants.
      const { videoIds } = await playlistAllVideoIds(
        client,
        channel.uploadsPlaylistId,
        50,
      );
      if (videoIds.length === 0) {
        const payload: GetChannelOverviewOutput = {
          channel,
          top_videos: [],
          units_consumed: UNIT_COST.channels_list + UNIT_COST.playlist_items_list,
        };
        return { resultCount: 1, payload };
      }

      const videosRes = await videosList(client, { ids: videoIds });
      const videos = videosRes.items.map(normaliseVideo);
      const topVideos = videos
        .slice()
        .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
        .slice(0, input.top_n);

      const payload: GetChannelOverviewOutput = {
        channel,
        top_videos: topVideos,
        units_consumed: totalUnits,
      };
      return { resultCount: topVideos.length + 1, payload };
    },
  });

  return attachQuotaSession(result, sessionId);
  });
}
