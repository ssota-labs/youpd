import { z } from 'zod';
import type { YouTubeClient } from '../client';

// playlistItems.list — 1 unit per call. We page through the uploads playlist
// to collect a channel's full video catalog cheaply: 1u per 50 items vs
// search.list's 100u per 50 items.

const PlaylistItemSchema = z.object({
  id: z.string(),
  snippet: z
    .object({
      publishedAt: z.string().optional(),
      title: z.string().optional(),
      resourceId: z
        .object({
          kind: z.string().optional(),
          videoId: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  contentDetails: z
    .object({
      videoId: z.string().optional(),
      videoPublishedAt: z.string().optional(),
    })
    .optional(),
});
export type PlaylistItem = z.infer<typeof PlaylistItemSchema>;

const PlaylistItemsResponseSchema = z.object({
  kind: z.string().optional(),
  nextPageToken: z.string().optional(),
  items: z.array(PlaylistItemSchema).default([]),
  pageInfo: z
    .object({
      totalResults: z.number().int().nonnegative().optional(),
      resultsPerPage: z.number().int().nonnegative().optional(),
    })
    .optional(),
});
export type PlaylistItemsResponse = z.infer<typeof PlaylistItemsResponseSchema>;

export type PlaylistItemsListInput = {
  playlistId: string;
  maxResults?: number;
  pageToken?: string;
};

export async function playlistItemsList(
  client: YouTubeClient,
  input: PlaylistItemsListInput,
  signal?: AbortSignal,
): Promise<PlaylistItemsResponse> {
  return client.request<PlaylistItemsResponse>({
    path: '/playlistItems',
    params: {
      part: 'contentDetails,snippet',
      playlistId: input.playlistId,
      maxResults: input.maxResults ?? 50,
      pageToken: input.pageToken,
    },
    schema: PlaylistItemsResponseSchema,
    signal,
  });
}

// Drain every page of a playlist, capped at maxItems. Returns just the video
// IDs in the order YouTube serves them (most recent uploads first).
export async function playlistAllVideoIds(
  client: YouTubeClient,
  playlistId: string,
  maxItems: number,
  signal?: AbortSignal,
): Promise<{ videoIds: string[]; pagesFetched: number }> {
  if (maxItems <= 0) return { videoIds: [], pagesFetched: 0 };
  const ids: string[] = [];
  let pageToken: string | undefined;
  let pages = 0;
  while (ids.length < maxItems) {
    const remaining = maxItems - ids.length;
    const pageSize = Math.min(50, remaining);
    const res: PlaylistItemsResponse = await playlistItemsList(
      client,
      { playlistId, maxResults: pageSize, pageToken },
      signal,
    );
    pages += 1;
    for (const item of res.items) {
      const id =
        item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId;
      if (id) ids.push(id);
      if (ids.length >= maxItems) break;
    }
    if (!res.nextPageToken || res.items.length === 0) break;
    pageToken = res.nextPageToken;
  }
  return { videoIds: ids, pagesFetched: pages };
}
