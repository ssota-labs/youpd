import { describe, expect, it, vi } from 'vitest';
import { getChannelAllVideos } from './get-channel-all-videos';
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

function channelItem(uploads: string) {
  return {
    id: 'C1',
    snippet: {
      title: 'C',
      description: '',
      publishedAt: '2023-01-01T00:00:00Z',
      thumbnails: {},
    },
    statistics: { subscriberCount: '100', videoCount: '120', viewCount: '5000' },
    contentDetails: { relatedPlaylists: { uploads } },
  };
}

function makeVideosResponse(ids: string[]) {
  return {
    items: ids.map((id) => ({
      id,
      snippet: {
        publishedAt: '2024-01-01T00:00:00Z',
        channelId: 'C1',
        title: id,
        description: '',
        thumbnails: {},
        channelTitle: 'C',
      },
      statistics: { viewCount: '1' },
    })),
  };
}

describe('getChannelAllVideos', () => {
  it('drains multiple playlist pages and reports actual unit usage', async () => {
    let playlistCalls = 0;
    const client = makeClient({
      '/channels': () => ({ items: [channelItem('UU1')] }),
      '/playlistItems': () => {
        playlistCalls += 1;
        if (playlistCalls === 1) {
          return {
            nextPageToken: 'p2',
            items: Array.from({ length: 50 }, (_, i) => ({
              id: `pi-a${i}`,
              contentDetails: { videoId: `a${i}` },
            })),
          };
        }
        if (playlistCalls === 2) {
          return {
            items: Array.from({ length: 25 }, (_, i) => ({
              id: `pi-b${i}`,
              contentDetails: { videoId: `b${i}` },
            })),
          };
        }
        return { items: [] };
      },
      '/videos': (params) => {
        const ids = String(params.id ?? '').split(',');
        return makeVideosResponse(ids);
      },
    });

    const out = await getChannelAllVideos(
      { channel_id: 'C1', max_videos: 75 },
      client,
    );
    expect(out.videos).toHaveLength(75);
    expect(out.pages_fetched).toBe(2);
    // 1 channels.list + 2 playlistItems pages + 2 videos.list batches (50+25)
    expect(out.units_consumed).toBe(5);
  });

  it('caps at the requested max_videos even when more are available', async () => {
    const client = makeClient({
      '/channels': () => ({ items: [channelItem('UU1')] }),
      '/playlistItems': () => ({
        nextPageToken: 'next',
        items: Array.from({ length: 50 }, (_, i) => ({
          id: `pi-${i}`,
          contentDetails: { videoId: `v${i}` },
        })),
      }),
      '/videos': (params) => {
        const ids = String(params.id ?? '').split(',');
        return makeVideosResponse(ids);
      },
    });

    const out = await getChannelAllVideos(
      { channel_id: 'C1', max_videos: 10 },
      client,
    );
    expect(out.videos).toHaveLength(10);
    expect(out.pages_fetched).toBe(1);
  });

  it('returns empty when uploads playlist is unknown', async () => {
    const client = makeClient({
      '/channels': () => ({
        items: [
          {
            id: 'C1',
            snippet: {
              title: 'C',
              description: '',
              publishedAt: '2023-01-01T00:00:00Z',
              thumbnails: {},
            },
            statistics: {},
            contentDetails: {},
          },
        ],
      }),
    });
    const out = await getChannelAllVideos(
      { channel_id: 'C1', max_videos: 50 },
      client,
    );
    expect(out.videos).toEqual([]);
    expect(out.pages_fetched).toBe(0);
  });
});
