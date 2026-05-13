import { z } from 'zod';
import type { YouTubeClient } from '../client';
import { RawVideoSchema, type RawVideo } from '../schemas';

// videos.list — 1 unit per call. Up to 50 IDs per batch. We chunk client-side
// when the caller passes more.

const VideosListResponseSchema = z.object({
  kind: z.string().optional(),
  items: z.array(RawVideoSchema).default([]),
  nextPageToken: z.string().optional(),
});
export type VideosListResponse = z.infer<typeof VideosListResponseSchema>;

export type VideoPart = 'snippet' | 'contentDetails' | 'statistics' | 'status';

export type VideosListInput =
  | {
      ids: string[];
      parts?: VideoPart[];
    }
  | {
      chart: 'mostPopular';
      regionCode?: string;
      videoCategoryId?: string;
      maxResults?: number;
      parts?: VideoPart[];
    };

const MAX_IDS_PER_BATCH = 50;

function chunkIds(ids: string[]): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += MAX_IDS_PER_BATCH) {
    out.push(ids.slice(i, i + MAX_IDS_PER_BATCH));
  }
  return out;
}

export type VideosListResult = {
  items: RawVideo[];
  batches: number;
};

export async function videosList(
  client: YouTubeClient,
  input: VideosListInput,
  signal?: AbortSignal,
): Promise<VideosListResult> {
  const parts = (input.parts ?? ['snippet', 'contentDetails', 'statistics']).join(',');

  if ('chart' in input) {
    const res = await client.request<VideosListResponse>({
      path: '/videos',
      params: {
        part: parts,
        chart: input.chart,
        regionCode: input.regionCode,
        videoCategoryId: input.videoCategoryId,
        maxResults: input.maxResults ?? 50,
      },
      schema: VideosListResponseSchema,
      signal,
    });
    return { items: res.items, batches: 1 };
  }

  const ids = input.ids.filter((s) => s.length > 0);
  if (ids.length === 0) return { items: [], batches: 0 };
  const batches = chunkIds(ids);
  const all: RawVideo[] = [];
  for (const batch of batches) {
    const res = await client.request<VideosListResponse>({
      path: '/videos',
      params: { part: parts, id: batch.join(',') },
      schema: VideosListResponseSchema,
      signal,
    });
    all.push(...res.items);
  }
  return { items: all, batches: batches.length };
}
