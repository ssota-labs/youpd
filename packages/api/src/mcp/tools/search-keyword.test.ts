import { describe, expect, it, vi } from 'vitest';
import type { z } from 'zod';
import type { YouTubeClient } from '@youpd/youtube';
import { searchKeyword, SearchKeywordInputSchema } from './search-keyword';

// runWithBudget hits the Supabase repos. We stub the module so tests run as
// pure functions without a live database.
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

function makeClient(handlers: {
  [path: string]: (params: Record<string, string | number | undefined>) => unknown;
}): YouTubeClient {
  return {
    request: async <T>(opts: {
      path: string;
      params: Record<string, string | number | undefined>;
      schema: z.ZodType<T>;
    }): Promise<T> => {
      const h = handlers[opts.path];
      if (!h) throw new Error(`unexpected path ${opts.path}`);
      return opts.schema.parse(h(opts.params));
    },
  };
}

describe('SearchKeywordInputSchema', () => {
  it('clamps max_results to <= 50', () => {
    expect(SearchKeywordInputSchema.safeParse({ keyword: 'k', max_results: 60 }).success).toBe(false);
  });
  it('defaults order to relevance and max_results to 50', () => {
    const parsed = SearchKeywordInputSchema.parse({ keyword: 'k' });
    expect(parsed.order).toBe('relevance');
    expect(parsed.max_results).toBe(50);
  });
});

describe('searchKeyword', () => {
  it('chains search.list → videos.list → channels.list and normalises', async () => {
    const client = makeClient({
      '/search': () => ({
        items: [
          { id: { videoId: 'v1' }, snippet: { title: 's' } },
          { id: { videoId: 'v2' }, snippet: { title: 's' } },
        ],
      }),
      '/videos': () => ({
        items: [
          {
            id: 'v1',
            snippet: {
              publishedAt: '2024-01-01T00:00:00Z',
              channelId: 'c1',
              title: 'T1',
              description: '',
              thumbnails: {},
              channelTitle: 'C1',
            },
            statistics: { viewCount: '100', likeCount: '5', commentCount: '1' },
            contentDetails: { duration: 'PT1M' },
          },
          {
            id: 'v2',
            snippet: {
              publishedAt: '2024-01-02T00:00:00Z',
              channelId: 'c1',
              title: 'T2',
              description: '',
              thumbnails: {},
              channelTitle: 'C1',
            },
            statistics: { viewCount: '200' },
            contentDetails: { duration: 'PT2M' },
          },
        ],
      }),
      '/channels': () => ({
        items: [
          {
            id: 'c1',
            snippet: {
              title: 'C1',
              description: '',
              publishedAt: '2023-01-01T00:00:00Z',
              thumbnails: {},
            },
            statistics: { subscriberCount: '1000', videoCount: '10', viewCount: '50000' },
            contentDetails: { relatedPlaylists: { uploads: 'UU1' } },
          },
        ],
      }),
    });
    const out = await searchKeyword(
      { keyword: 'test', max_results: 50, order: 'relevance' },
      client,
    );
    expect(out.videos).toHaveLength(2);
    expect(out.videos[0]!.videoId).toBe('v1');
    expect(out.channels).toHaveLength(1);
    expect(out.channels[0]!.channelId).toBe('c1');
    expect(out.units_consumed).toBe(100 + 1 + 1);
    expect(out.keyword).toBe('test');
  });

  it('returns empty arrays when search has no results', async () => {
    const client = makeClient({
      '/search': () => ({ items: [] }),
    });
    const out = await searchKeyword(
      { keyword: 'no-results', max_results: 50, order: 'relevance' },
      client,
    );
    expect(out.videos).toEqual([]);
    expect(out.channels).toEqual([]);
    expect(out.units_consumed).toBe(100); // search.list only — videos/channels never called
  });

  it('deduplicates videos that recur across paginated search.list calls', async () => {
    // YouTube ranking can shift between page fetches, so the same videoId
    // sometimes appears on consecutive pages. The harvest writer relies on
    // searchKeyword presenting a unique video set or Postgres rejects the
    // canonical videos upsert with `ON CONFLICT DO UPDATE cannot affect row
    // a second time`.
    let searchPage = 0;
    const client = makeClient({
      '/search': () => {
        searchPage += 1;
        if (searchPage === 1) {
          return {
            items: [
              { id: { videoId: 'vA' }, snippet: {} },
              { id: { videoId: 'vB' }, snippet: {} },
            ],
            nextPageToken: 'page-2',
          };
        }
        return {
          items: [
            // vB repeats here from page 1 — ranking shifted.
            { id: { videoId: 'vB' }, snippet: {} },
            { id: { videoId: 'vC' }, snippet: {} },
          ],
        };
      },
      '/videos': (params) => {
        const ids = String(params.id ?? '').split(',').filter(Boolean);
        return {
          items: ids.map((id) => ({
            id,
            snippet: {
              publishedAt: '2024-01-01T00:00:00Z',
              channelId: 'c1',
              title: id,
              description: '',
              thumbnails: {},
              channelTitle: 'C1',
            },
            statistics: { viewCount: '1' },
            contentDetails: { duration: 'PT1M' },
          })),
        };
      },
      '/channels': () => ({
        items: [
          {
            id: 'c1',
            snippet: {
              title: 'C1',
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
    const out = await searchKeyword(
      { keyword: 'q', max_results: 50, max_total_results: 200, order: 'relevance' },
      client,
    );
    const ids = out.videos.map((v) => v.videoId);
    expect(ids).toEqual(['vA', 'vB', 'vC']); // vB only once, first-occurrence wins
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('deduplicates channel ids before channels.list', async () => {
    let channelsCalls = 0;
    const client = makeClient({
      '/search': () => ({
        items: [
          { id: { videoId: 'v1' }, snippet: {} },
          { id: { videoId: 'v2' }, snippet: {} },
        ],
      }),
      '/videos': () => ({
        items: [
          {
            id: 'v1',
            snippet: {
              publishedAt: '2024-01-01T00:00:00Z',
              channelId: 'cSAME',
              title: 'T1',
              description: '',
              thumbnails: {},
              channelTitle: 'X',
            },
          },
          {
            id: 'v2',
            snippet: {
              publishedAt: '2024-01-02T00:00:00Z',
              channelId: 'cSAME',
              title: 'T2',
              description: '',
              thumbnails: {},
              channelTitle: 'X',
            },
          },
        ],
      }),
      '/channels': (params) => {
        channelsCalls += 1;
        const ids = String(params.id ?? '').split(',').filter(Boolean);
        expect(ids).toEqual(['cSAME']);
        return {
          items: [
            {
              id: 'cSAME',
              snippet: {
                title: 'X',
                description: '',
                publishedAt: '2023-01-01T00:00:00Z',
                thumbnails: {},
              },
              statistics: {},
              contentDetails: {},
            },
          ],
        };
      },
    });
    const out = await searchKeyword(
      { keyword: 'q', max_results: 50, order: 'relevance' },
      client,
    );
    expect(channelsCalls).toBe(1);
    expect(out.channels).toHaveLength(1);
  });
});
