import { z } from 'zod';
import {
  commentThreadsList,
  normaliseCommentThread,
  UNIT_COST,
  YouTubeApiError,
  type CommentSummary,
  type YouTubeClient,
} from '@youpd/youtube';
import { upsertCanonicalComments } from '@youpd/supabase/repositories/youtube';
import { getYouTubeClient } from '../youtube-client';
import { attachQuotaSession, runWithBudget } from '../quota';

export const GetVideoCommentsInputSchema = z
  .object({
    video_id: z.string().min(1).max(50),
    top_n: z.number().int().min(1).max(100).default(50),
  })
  .strict();
export type GetVideoCommentsInput = z.infer<typeof GetVideoCommentsInputSchema>;

export type GetVideoCommentsOutput = {
  video_id: string;
  top_comments: CommentSummary[];
  comments_disabled: boolean;
  language_hint: string | null;
  units_consumed: number;
  quota_session_id?: string;
};

// Per-spec policy: order=relevance + maxResults=100 (API max), sort locally
// by likeCount desc, slice TOP N. Exactly 1 unit per call.
//
// language_hint is a very rough heuristic — picks the dominant Hangul vs
// Latin script in the top-3 by likes. The agent's LLM does the real sentiment
// + topic tagging downstream.
export async function getVideoComments(
  input: GetVideoCommentsInput,
  client: YouTubeClient = getYouTubeClient(),
): Promise<GetVideoCommentsOutput> {
  const totalUnits = UNIT_COST.comment_threads_list;

  const { result, sessionId } = await runWithBudget<GetVideoCommentsOutput>({
    operation: 'video-comments',
    units: totalUnits,
    videoIds: [input.video_id],
    call: async () => {
      try {
        const threads = await commentThreadsList(client, {
          videoId: input.video_id,
          order: 'relevance',
          maxResults: 100,
        });
        const top = threads.items
          .map(normaliseCommentThread)
          .sort((a, b) => b.likeCount - a.likeCount)
          .slice(0, input.top_n);

        const payload: GetVideoCommentsOutput = {
          video_id: input.video_id,
          top_comments: top,
          comments_disabled: false,
          language_hint: guessLanguage(top),
          units_consumed: totalUnits,
        };
        return { resultCount: top.length, payload };
      } catch (err) {
        if (err instanceof YouTubeApiError && err.reason === 'commentsDisabled') {
          const payload: GetVideoCommentsOutput = {
            video_id: input.video_id,
            top_comments: [],
            comments_disabled: true,
            language_hint: null,
            units_consumed: totalUnits,
          };
          return { resultCount: 0, payload };
        }
        throw err;
      }
    },
  });

  await persistVideoComments(result);
  return attachQuotaSession(result, sessionId);
}

async function persistVideoComments(result: GetVideoCommentsOutput): Promise<void> {
  if (!process.env.DATABASE_URL || result.comments_disabled) return;
  try {
    await upsertCanonicalComments(
      result.top_comments.map((comment) => ({
        commentId: comment.commentId,
        videoId: comment.videoId,
        authorDisplayName: comment.authorDisplayName,
        authorChannelId: comment.authorChannelId,
        text: comment.text,
        likeCount: comment.likeCount,
        totalReplyCount: comment.totalReplyCount,
        publishedAt: comment.publishedAt,
        updatedAt: comment.updatedAt,
      })),
    );
  } catch (err) {
    console.warn('[youpd] failed to persist video comments', err);
  }
}

const HANGUL = /[가-힯ᄀ-ᇿ㄰-㆏]/;
const HIRAGANA_KATAKANA = /[぀-ヿ]/;
const CJK = /[一-鿿]/;

function guessLanguage(comments: CommentSummary[]): string | null {
  if (comments.length === 0) return null;
  const sample = comments.slice(0, 3).map((c) => c.text).join('\n');
  if (HANGUL.test(sample)) return 'ko';
  if (HIRAGANA_KATAKANA.test(sample)) return 'ja';
  if (CJK.test(sample)) return 'zh';
  return 'en';
}
