import { describe, expect, it, vi } from 'vitest';
import { fetchHotChart } from './fetch-hot-chart';
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

describe('fetchHotChart', () => {
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
      { region_code: 'KR', category_id: '22', limit: 25 },
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
    const out = await fetchHotChart({ region_code: 'US', limit: 5 }, client);
    expect(out.category_id).toBeNull();
    expect(out.videos).toEqual([]);
  });
});
