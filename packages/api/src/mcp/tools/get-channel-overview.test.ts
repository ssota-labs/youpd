import { describe, expect, it, vi } from 'vitest';
import { getChannelOverview } from './get-channel-overview';
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

function channelItem(id: string, uploads: string | null) {
  return {
    id,
    snippet: {
      title: 'C',
      description: '',
      publishedAt: '2023-01-01T00:00:00Z',
      thumbnails: {},
    },
    statistics: { subscriberCount: '100', videoCount: '50', viewCount: '5000' },
    contentDetails: uploads ? { relatedPlaylists: { uploads } } : {},
  };
}
function playlistPage(ids: string[], nextPageToken?: string) {
  return {
    nextPageToken,
    items: ids.map((id) => ({ id: `pi-${id}`, contentDetails: { videoId: id } })),
  };
}
function videoItem(id: string, views: number) {
  return {
    id,
    snippet: {
      publishedAt: '2024-01-01T00:00:00Z',
      channelId: 'C1',
      title: `T${id}`,
      description: '',
      thumbnails: {},
      channelTitle: 'C',
    },
    statistics: { viewCount: String(views) },
  };
}

describe('getChannelOverview', () => {
  it('returns channel + top videos sorted by views desc', async () => {
    const client = makeClient({
      '/channels': () => ({ items: [channelItem('C1', 'UU1')] }),
      '/playlistItems': () => playlistPage(['v1', 'v2', 'v3']),
      '/videos': () => ({
        items: [videoItem('v1', 10), videoItem('v2', 1000), videoItem('v3', 50)],
      }),
    });
    const out = await getChannelOverview({ channel_id: 'C1', top_n: 2 }, client);
    expect(out.channel?.channelId).toBe('C1');
    expect(out.top_videos.map((v) => v.videoId)).toEqual(['v2', 'v3']);
    expect(out.units_consumed).toBe(3);
  });

  it('returns empty when channel has no uploads playlist', async () => {
    const client = makeClient({
      '/channels': () => ({ items: [channelItem('C1', null)] }),
    });
    const out = await getChannelOverview({ channel_id: 'C1', top_n: 10 }, client);
    expect(out.top_videos).toEqual([]);
    expect(out.units_consumed).toBe(1);
  });

  it('returns null channel when YouTube has no row', async () => {
    const client = makeClient({
      '/channels': () => ({ items: [] }),
    });
    const out = await getChannelOverview({ channel_id: 'X', top_n: 10 }, client);
    expect(out.channel).toBeNull();
    expect(out.top_videos).toEqual([]);
  });
});
