import { z } from 'zod';
import type { YouTubeClient } from '../client';
import { RawSearchItemSchema } from '../schemas';

// search.list — 100 units per call. We return raw items so callers can decide
// whether to follow up with a videos.list / channels.list to enrich them.

const SearchListResponseSchema = z.object({
  kind: z.string().optional(),
  nextPageToken: z.string().optional(),
  pageInfo: z
    .object({
      totalResults: z.number().int().nonnegative().optional(),
      resultsPerPage: z.number().int().nonnegative().optional(),
    })
    .optional(),
  items: z.array(RawSearchItemSchema).default([]),
});
export type SearchListResponse = z.infer<typeof SearchListResponseSchema>;

export type SearchListInput = {
  q?: string;
  maxResults?: number;
  order?: 'date' | 'rating' | 'relevance' | 'title' | 'videoCount' | 'viewCount';
  publishedAfter?: string;
  publishedBefore?: string;
  regionCode?: string;
  type?: 'video' | 'channel' | 'playlist';
  videoCategoryId?: string;
  channelId?: string;
  pageToken?: string;
  relevanceLanguage?: string;
};

export async function searchList(
  client: YouTubeClient,
  input: SearchListInput,
  signal?: AbortSignal,
): Promise<SearchListResponse> {
  return client.request<SearchListResponse>({
    path: '/search',
    params: {
      part: 'snippet',
      q: input.q,
      maxResults: input.maxResults ?? 50,
      order: input.order,
      publishedAfter: input.publishedAfter,
      publishedBefore: input.publishedBefore,
      regionCode: input.regionCode,
      type: input.type,
      videoCategoryId: input.videoCategoryId,
      channelId: input.channelId,
      pageToken: input.pageToken,
      relevanceLanguage: input.relevanceLanguage,
    },
    schema: SearchListResponseSchema,
    signal,
  });
}
