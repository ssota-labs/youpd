import { describe, expect, it, vi } from 'vitest';
import { YouTubeApiError } from '@youpd/youtube';
import { getVideoComments } from './get-video-comments';
import { makeClient } from './test-utils';

vi.mock('../quota', () => ({
  attachQuotaSession: (result: unknown, sid: string | null) =>
    sid == null
      ? result
      : { ...(result as Record<string, unknown>), quota_session_id: sid },
  runWithBudget: async <T>(input: {
    units: number;
    call: () => Promise<{ resultCount: number; payload: T }>;
  }) => {
    const { payload } = await input.call();
    return { result: payload, unitsConsumed: input.units, sessionId: null };
  },
  QuotaExceededAtBudgetError: class extends Error {},
}));

function comment(id: string, likeCount: number, text = 'hi') {
  return {
    id,
    snippet: {
      videoId: 'V1',
      totalReplyCount: 0,
      topLevelComment: {
        id,
        snippet: {
          authorDisplayName: 'A',
          textOriginal: text,
          textDisplay: text,
          likeCount,
          publishedAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      },
    },
  };
}

describe('getVideoComments', () => {
  it('returns top_n by likeCount desc and detects Korean language', async () => {
    const client = makeClient({
      '/commentThreads': () => ({
        items: [
          comment('c1', 3, '평범한 의견'),
          comment('c2', 100, '진짜 좋네요'),
          comment('c3', 50, '대박 영상'),
        ],
      }),
    });
    const out = await getVideoComments(
      { video_id: 'V1', top_n: 2 },
      client,
    );
    expect(out.top_comments.map((c) => c.commentId)).toEqual(['c2', 'c3']);
    expect(out.language_hint).toBe('ko');
    expect(out.units_consumed).toBe(1);
  });

  it('flags comments_disabled when YouTube refuses', async () => {
    const client = makeClient({
      '/commentThreads': () => {
        throw new YouTubeApiError({
          message: 'comments disabled',
          status: 403,
          reason: 'commentsDisabled',
          raw: null,
        });
      },
    });
    const out = await getVideoComments(
      { video_id: 'V1', top_n: 50 },
      client,
    );
    expect(out.comments_disabled).toBe(true);
    expect(out.top_comments).toEqual([]);
    expect(out.language_hint).toBeNull();
  });
});
