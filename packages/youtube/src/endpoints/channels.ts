import { z } from 'zod';
import type { YouTubeClient } from '../client';
import { RawChannelSchema, type RawChannel } from '../schemas';

// channels.list — 1 unit per call. Up to 50 IDs per batch.

const ChannelsListResponseSchema = z.object({
  kind: z.string().optional(),
  items: z.array(RawChannelSchema).default([]),
});
export type ChannelsListResponse = z.infer<typeof ChannelsListResponseSchema>;

export type ChannelPart = 'snippet' | 'statistics' | 'contentDetails' | 'brandingSettings';

export type ChannelsListInput = {
  ids: string[];
  parts?: ChannelPart[];
};

const MAX_IDS_PER_BATCH = 50;

export type ChannelsListResult = {
  items: RawChannel[];
  batches: number;
};

export async function channelsList(
  client: YouTubeClient,
  input: ChannelsListInput,
  signal?: AbortSignal,
): Promise<ChannelsListResult> {
  const ids = input.ids.filter((s) => s.length > 0);
  if (ids.length === 0) return { items: [], batches: 0 };
  const parts = (input.parts ?? ['snippet', 'statistics', 'contentDetails']).join(',');

  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += MAX_IDS_PER_BATCH) {
    batches.push(ids.slice(i, i + MAX_IDS_PER_BATCH));
  }
  const all: RawChannel[] = [];
  for (const batch of batches) {
    const res = await client.request<ChannelsListResponse>({
      path: '/channels',
      params: { part: parts, id: batch.join(',') },
      schema: ChannelsListResponseSchema,
      signal,
    });
    all.push(...res.items);
  }
  return { items: all, batches: batches.length };
}
