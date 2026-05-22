import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchHotChart } from './fetch-hot-chart';
import { makeClient } from './test-utils';

const repoMocks = vi.hoisted(() => ({
  upsertChannels: vi.fn().mockResolvedValue([]),
  upsertVideos: vi.fn().mockResolvedValue([]),
  upsertHotVideos: vi.fn().mockResolvedValue(undefined),
}));

const batchMocks = vi.hoisted(() => ({
  fetchChannelsBatch: vi.fn(),
}));

vi.mock('./fetch-channels-batch', () => ({
  fetchChannelsBatch: batchMocks.fetchChannelsBatch,
}));

vi.mock('@youpd/supabase/repositories/youtube', () => ({
  upsertChannels: repoMocks.upsertChannels,
  upsertVideos: repoMocks.upsertVideos,
  upsertHotVideos: repoMocks.upsertHotVideos,
}));

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

describe('fetchHotChart', () => {
  const prevDbUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://local/test';
    batchMocks.fetchChannelsBatch.mockResolvedValue({
      channels: [
        {
          channelId: 'c1',
          title: 'C',
          description: '',
          publishedAt: '2024-01-01T00:00:00Z',
          thumbnails: {},
          subscriberCount: 100,
          videoCount: 10,
          viewCount: 1000,
          hiddenSubscriberCount: false,
          uploadsPlaylistId: 'UU1',
          country: 'KR',
          url: 'https://www.youtube.com/channel/c1',
        },
      ],
      missing_channel_ids: [],
      units_consumed: 1,
    });
  });

  afterEach(() => {
    if (prevDbUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevDbUrl;
  });

  it('skips repository writes when persist is false', async () => {
    const client = makeClient({
      '/videos': () => ({
        items: [
          {
            id: 'v1',
            snippet: {
              publishedAt: '2024-01-01T00:00:00Z',
              channelId: 'c1',
              title: 'Hot',
              description: '',
              thumbnails: {},
              channelTitle: 'C',
            },
            statistics: { viewCount: '100' },
          },
        ],
      }),
    });
    await fetchHotChart(
      { region_code: 'KR', category_id: '22', limit: 10, persist: false },
      client,
    );
    expect(repoMocks.upsertChannels).not.toHaveBeenCalled();
    expect(repoMocks.upsertVideos).not.toHaveBeenCalled();
    expect(repoMocks.upsertHotVideos).not.toHaveBeenCalled();
  });

  it('persists when persist is true (default)', async () => {
    const client = makeClient({
      '/videos': () => ({
        items: [
          {
            id: 'v1',
            snippet: {
              publishedAt: '2024-01-01T00:00:00Z',
              channelId: 'c1',
              title: 'Hot',
              description: '',
              thumbnails: {},
              channelTitle: 'C',
            },
            statistics: { viewCount: '100' },
          },
        ],
      }),
    });
    await fetchHotChart(
      { region_code: 'KR', category_id: '22', limit: 10, persist: true },
      client,
    );
    expect(batchMocks.fetchChannelsBatch).toHaveBeenCalledWith({ channel_ids: ['c1'] });
    expect(repoMocks.upsertChannels).toHaveBeenCalled();
    expect(repoMocks.upsertVideos).toHaveBeenCalled();
    expect(repoMocks.upsertHotVideos).toHaveBeenCalled();
  });

  it('uses chart=mostPopular with regionCode and categoryId', async () => {
    const client = makeClient({
      '/videos': (params) => {
        expect(params.chart).toBe('mostPopular');
        expect(params.regionCode).toBe('KR');
        expect(params.videoCategoryId).toBe('22');
        return {
          items: [
            {
              id: 'v1',
              snippet: {
                publishedAt: '2024-01-01T00:00:00Z',
                channelId: 'c1',
                title: 'Hot',
                description: '',
                thumbnails: {},
                channelTitle: 'C',
              },
              statistics: { viewCount: '100' },
            },
          ],
        };
      },
    });
    const out = await fetchHotChart(
      { region_code: 'KR', category_id: '22', limit: 25, persist: true },
      client,
    );
    expect(out.videos).toHaveLength(1);
    expect(out.source).toBe('chart=mostPopular');
    expect(out.units_consumed).toBe(1);
    expect(out.category_id).toBe('22');
  });

  it('omits category_id when not provided', async () => {
    const client = makeClient({
      '/videos': (params) => {
        expect(params.videoCategoryId).toBeUndefined();
        return { items: [] };
      },
    });
    const out = await fetchHotChart(
      { region_code: 'US', limit: 5, persist: true },
      client,
    );
    expect(out.category_id).toBeNull();
    expect(out.videos).toEqual([]);
  });
});
