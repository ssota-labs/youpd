import { z } from 'zod';
import {
  channelsList,
  normaliseChannel,
  normaliseVideo,
  playlistItemsList,
  UNIT_COST,
  videosList,
  type ChannelSummary,
  type VideoSummary,
  type YouTubeClient,
} from '@youpd/youtube';
import { getYouTubeClient } from '../mcp/youtube-client';
import { runWithBudget } from '../mcp/quota';

/** One uploads-playlist step + batched videos.list for serverless-friendly pagination (Worker loops with meta.nextPlaylistPageToken). */
export const GetChannelVideosPageInputSchema = z
  .object({
    channel_id: z.string().min(1).max(50),
    /** Skip channels.list when set (after first page). */
    uploads_playlist_id: z.string().min(1).optional(),
    playlist_page_token: z.string().optional(),
    page_size: z.number().int().min(1).max(50).default(50),
  })
  .strict();

export type GetChannelVideosPageInput = z.infer<
  typeof GetChannelVideosPageInputSchema
>;

export type GetChannelVideosPageOutput = {
  channel: ChannelSummary | null;
  uploads_playlist_id: string | null;
  videos: VideoSummary[];
  playlist_next_page_token: string | null;
  /** True when uploads playlist returned no further pages. */
  playlist_done: boolean;
  units_consumed: number;
  quota_session_id?: string;
};

export async function getChannelVideosPage(
  input: GetChannelVideosPageInput,
  client: YouTubeClient = getYouTubeClient(),
): Promise<GetChannelVideosPageOutput> {
  const playlistId = input.uploads_playlist_id;
  const needsChannelLookup = !playlistId;
  const uploadsId = playlistId ?? null;

  if (needsChannelLookup) {
    const units =
      UNIT_COST.channels_list +
      UNIT_COST.playlist_items_list +
      UNIT_COST.videos_list;
    const { result, sessionId } = await runWithBudget<GetChannelVideosPageOutput>({
      operation: 'channel-videos-page',
      units,
      channelId: input.channel_id,
      call: async () => {
        const channelsRes = await channelsList(client, { ids: [input.channel_id] });
        const raw = channelsRes.items[0];
        if (!raw) {
          return {
            resultCount: 0,
            payload: {
              channel: null,
              uploads_playlist_id: null,
              videos: [],
              playlist_next_page_token: null,
              playlist_done: true,
              units_consumed: UNIT_COST.channels_list,
            },
          };
        }
        const ch = normaliseChannel(raw);
        const up = ch.uploadsPlaylistId;
        if (!up) {
          return {
            resultCount: 0,
            payload: {
              channel: ch,
              uploads_playlist_id: null,
              videos: [],
              playlist_next_page_token: null,
              playlist_done: true,
              units_consumed: UNIT_COST.channels_list,
            },
          };
        }
        const pl = await playlistItemsList(client, {
          playlistId: up,
          maxResults: input.page_size,
          pageToken: input.playlist_page_token,
        });
        const ids = pl.items
          .map(
            (it) =>
              it.contentDetails?.videoId ?? it.snippet?.resourceId?.videoId,
          )
          .filter((s): s is string => typeof s === 'string' && s.length > 0);
        let videos: VideoSummary[] = [];
        let vidBatches = 0;
        if (ids.length > 0) {
          const vr = await videosList(client, { ids });
          videos = vr.items.map(normaliseVideo);
          vidBatches = vr.batches;
        }
        const consumed =
          UNIT_COST.channels_list +
          UNIT_COST.playlist_items_list +
          vidBatches * UNIT_COST.videos_list;
        return {
          resultCount: videos.length,
          payload: {
            channel: ch,
            uploads_playlist_id: up,
            videos,
            playlist_next_page_token: pl.nextPageToken ?? null,
            playlist_done: !pl.nextPageToken || pl.items.length === 0,
            units_consumed: consumed,
          },
        };
      },
    });
    return withQuotaSession(result, sessionId);
  }

  if (!uploadsId) {
    throw new Error(
      'uploads_playlist_id is required when playlist_page_token is used without channels.list context',
    );
  }

  // Continuation: playlist + videos only
  const units = UNIT_COST.playlist_items_list + UNIT_COST.videos_list;
  const { result, sessionId } = await runWithBudget<GetChannelVideosPageOutput>({
    operation: 'channel-videos-page',
    units,
    channelId: input.channel_id,
    call: async () => {
      const pl = await playlistItemsList(client, {
        playlistId: uploadsId,
        maxResults: input.page_size,
        pageToken: input.playlist_page_token,
      });
      const ids = pl.items
        .map(
          (it) =>
            it.contentDetails?.videoId ?? it.snippet?.resourceId?.videoId,
        )
        .filter((s): s is string => typeof s === 'string' && s.length > 0);
      let videos: VideoSummary[] = [];
      let vidBatches = 0;
      if (ids.length > 0) {
        const vr = await videosList(client, { ids });
        videos = vr.items.map(normaliseVideo);
        vidBatches = vr.batches;
      }
      const consumed =
        UNIT_COST.playlist_items_list +
        vidBatches * UNIT_COST.videos_list;
      return {
        resultCount: videos.length,
        payload: {
          channel: null,
          uploads_playlist_id: uploadsId,
          videos,
          playlist_next_page_token: pl.nextPageToken ?? null,
          playlist_done: !pl.nextPageToken || pl.items.length === 0,
          units_consumed: consumed,
        },
      };
    },
  });
  return withQuotaSession(result, sessionId);
}

function withQuotaSession(
  out: GetChannelVideosPageOutput,
  sessionId: string | null,
): GetChannelVideosPageOutput {
  if (!sessionId) return out;
  return { ...out, quota_session_id: sessionId };
}
