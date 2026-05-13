import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { playlistAllVideoIds } from './playlistItems';
import type { YouTubeClient } from '../client';

function fakeClient(
  pages: Array<{ items: { videoId: string }[]; nextPageToken?: string }>,
): { client: YouTubeClient; calls: number } {
  let i = 0;
  const state = { calls: 0 };
  const client: YouTubeClient = {
    request: async <T>(opts: {
      path: string;
      params: Record<string, string | number | undefined>;
      schema: z.ZodType<T>;
    }): Promise<T> => {
      state.calls += 1;
      const page = pages[i++];
      if (!page) throw new Error('no more pages programmed');
      return opts.schema.parse({
        items: page.items.map((it) => ({
          id: `pi-${it.videoId}`,
          contentDetails: { videoId: it.videoId },
        })),
        nextPageToken: page.nextPageToken,
      });
    },
  };
  return { client, calls: state.calls };
}

describe('playlistAllVideoIds', () => {
  it('returns empty when maxItems = 0', async () => {
    const { client } = fakeClient([]);
    const out = await playlistAllVideoIds(client, 'UU1', 0);
    expect(out.videoIds).toEqual([]);
    expect(out.pagesFetched).toBe(0);
  });

  it('drains exactly one page when the page covers the cap', async () => {
    const { client } = fakeClient([
      { items: Array.from({ length: 50 }, (_, i) => ({ videoId: `v${i}` })) },
    ]);
    const out = await playlistAllVideoIds(client, 'UU1', 30);
    expect(out.videoIds).toHaveLength(30);
    expect(out.pagesFetched).toBe(1);
  });

  it('paginates with nextPageToken and stops at maxItems', async () => {
    const { client } = fakeClient([
      {
        items: Array.from({ length: 50 }, (_, i) => ({ videoId: `a${i}` })),
        nextPageToken: 'p2',
      },
      {
        items: Array.from({ length: 50 }, (_, i) => ({ videoId: `b${i}` })),
        nextPageToken: 'p3',
      },
      { items: Array.from({ length: 50 }, (_, i) => ({ videoId: `c${i}` })) },
    ]);
    const out = await playlistAllVideoIds(client, 'UU1', 120);
    expect(out.videoIds).toHaveLength(120);
    expect(out.pagesFetched).toBe(3);
  });

  it('stops when there are no more pages even if maxItems > available', async () => {
    const { client } = fakeClient([
      { items: [{ videoId: 'v1' }, { videoId: 'v2' }] },
    ]);
    const out = await playlistAllVideoIds(client, 'UU1', 50);
    expect(out.videoIds).toEqual(['v1', 'v2']);
    expect(out.pagesFetched).toBe(1);
  });
});
