import { z } from 'zod';
import type { YouTubeClient } from '../client';
import { RawCommentThreadSchema, type RawCommentThread } from '../schemas';

// commentThreads.list — 1 unit per call. order=relevance + maxResults=100 gets
// us the API's relevance picks; callers then sort by likeCount and slice TOP 50
// per the spec policy.

const CommentThreadsListResponseSchema = z.object({
  kind: z.string().optional(),
  items: z.array(RawCommentThreadSchema).default([]),
  nextPageToken: z.string().optional(),
});
export type CommentThreadsListResponse = z.infer<
  typeof CommentThreadsListResponseSchema
>;

export type CommentThreadsListInput = {
  videoId: string;
  order?: 'time' | 'relevance';
  maxResults?: number;
  pageToken?: string;
};

export async function commentThreadsList(
  client: YouTubeClient,
  input: CommentThreadsListInput,
  signal?: AbortSignal,
): Promise<{ items: RawCommentThread[]; nextPageToken?: string }> {
  const res = await client.request<CommentThreadsListResponse>({
    path: '/commentThreads',
    params: {
      part: 'snippet',
      videoId: input.videoId,
      order: input.order ?? 'relevance',
      maxResults: input.maxResults ?? 100,
      pageToken: input.pageToken,
    },
    schema: CommentThreadsListResponseSchema,
    signal,
  });
  return { items: res.items, nextPageToken: res.nextPageToken };
}
