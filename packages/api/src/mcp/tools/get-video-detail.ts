import { z } from 'zod';
import {
  channelsList,
  commentThreadsList,
  normaliseChannel,
  normaliseCommentThread,
  normaliseVideo,
  UNIT_COST,
  videosList,
  YouTubeApiError,
  type ChannelSummary,
  type CommentSummary,
  type VideoSummary,
  type YouTubeClient,
} from '@youpd/youtube';
import { getYouTubeClient } from '../youtube-client';
import { attachQuotaSession, runWithBudget } from '../quota';

export const GetVideoDetailInputSchema = z
  .object({
    video_id: z.string().min(1).max(50),
    include_comments: z.boolean().default(true),
    comments_top_n: z.number().int().min(0).max(100).default(50),
  })
  .strict();
export type GetVideoDetailInput = z.infer<typeof GetVideoDetailInputSchema>;

export type GetVideoDetailOutput = {
  video: VideoSummary | null;
  channel: ChannelSummary | null;
  top_comments: CommentSummary[];
  comments_disabled: boolean;
  units_consumed: number;
  quota_session_id?: string;
};

const VIDEOS_UNITS = UNIT_COST.videos_list;
const CHANNELS_UNITS = UNIT_COST.channels_list;
const COMMENTS_UNITS = UNIT_COST.comment_threads_list;

export async function getVideoDetail(
  input: GetVideoDetailInput,
  client: YouTubeClient = getYouTubeClient(),
): Promise<GetVideoDetailOutput> {
  const wantComments = input.include_comments && input.comments_top_n > 0;
  const totalUnits = VIDEOS_UNITS + CHANNELS_UNITS + (wantComments ? COMMENTS_UNITS : 0);

  const { result, sessionId } = await runWithBudget<GetVideoDetailOutput>({
    operation: 'video-detail',
    units: totalUnits,
    videoIds: [input.video_id],
    call: async () => {
      const videosRes = await videosList(client, { ids: [input.video_id] });
      const rawVideo = videosRes.items[0];
      if (!rawVideo) {
        const payload: GetVideoDetailOutput = {
          video: null,
          channel: null,
          top_comments: [],
          comments_disabled: false,
          units_consumed: VIDEOS_UNITS,
        };
        return { resultCount: 0, payload };
      }

      const video = normaliseVideo(rawVideo);
      const channelsRes = await channelsList(client, { ids: [video.channelId] });
      const channel = channelsRes.items[0]
        ? normaliseChannel(channelsRes.items[0])
        : null;

      let topComments: CommentSummary[] = [];
      let commentsDisabled = false;
      if (wantComments) {
        try {
          const threads = await commentThreadsList(client, {
            videoId: input.video_id,
            order: 'relevance',
            maxResults: 100,
          });
          topComments = threads.items
            .map(normaliseCommentThread)
            .sort((a, b) => b.likeCount - a.likeCount)
            .slice(0, input.comments_top_n);
        } catch (err) {
          if (err instanceof YouTubeApiError && err.reason === 'commentsDisabled') {
            commentsDisabled = true;
          } else {
            throw err;
          }
        }
      }

      const payload: GetVideoDetailOutput = {
        video,
        channel,
        top_comments: topComments,
        comments_disabled: commentsDisabled,
        units_consumed: totalUnits,
      };
      return { resultCount: topComments.length + 1, payload };
    },
  });

  return attachQuotaSession(result, sessionId);
}
