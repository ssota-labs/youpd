import { describe, expect, it, vi } from 'vitest';
import { fetchTrendingByKeyword } from './fetch-trending-by-keyword';
import { makeClient } from './test-utils';

vi.mock('../quota', () => ({
  runWithBudget: async <T>(input: {
    units: number;
    call: () => Promise<{ resultCount: number; payload: T }>;
  }) => {
    const { payload } = await input.call();
    return { result: payload, unitsConsumed: input.units };
  },
  QuotaExceededAtBudgetError: class extends Error {},
}));

describe('fetchTrendingByKeyword', () => {
  it('passes publishedAfter + order=viewCount to search.list', async () => {
    let capturedPublishedAfter = '';
    const before = Date.now();
    const client = makeClient({
      '/search': (params) => {
        expect(params.order).toBe('viewCount');
        expect(typeof params.publishedAfter).toBe('string');
        capturedPublishedAfter = String(params.publishedAfter);
        return {
          items: [{ id: { videoId: 'v1' }, snippet: {} }],
        };
      },
      '/videos': () => ({
        items: [
          {
            id: 'v1',
            snippet: {
              publishedAt: '2024-01-01T00:00:00Z',
              channelId: 'c1',
              title: 'T',
              description: '',
              thumbnails: {},
              channelTitle: 'C',
            },
            statistics: { viewCount: '99' },
          },
        ],
      }),
      '/channels': () => ({
        items: [
          {
            id: 'c1',
            snippet: {
              title: 'C',
              description: '',
              publishedAt: '2023-01-01T00:00:00Z',
              thumbnails: {},
            },
            statistics: { subscriberCount: '1' },
            contentDetails: {},
          },
        ],
      }),
    });
    const out = await fetchTrendingByKeyword(
      { keyword: 'k', hours: 24, max_results: 50 },
      client,
    );
    expect(out.videos).toHaveLength(1);
    expect(out.channels).toHaveLength(1);
    expect(out.source).toBe('search.recent24h');
    expect(out.units_consumed).toBe(102);

    const cutoffMs = Date.parse(capturedPublishedAfter);
    // 24h ago, give or take 5s for clock drift between test setup and call.
    expect(before - cutoffMs).toBeGreaterThanOrEqual(24 * 3600 * 1000 - 5000);
    expect(before - cutoffMs).toBeLessThanOrEqual(24 * 3600 * 1000 + 5000);
  });

  it('returns empty arrays when search yields nothing (still charges 100u)', async () => {
    const client = makeClient({
      '/search': () => ({ items: [] }),
    });
    const out = await fetchTrendingByKeyword(
      { keyword: 'none', hours: 24, max_results: 10 },
      client,
    );
    expect(out.videos).toEqual([]);
    expect(out.channels).toEqual([]);
    expect(out.units_consumed).toBe(100);
  });
});
