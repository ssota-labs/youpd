import { beforeEach, describe, expect, it, vi } from 'vitest';
import { collectTrendingMatrixDaily } from './collect-trending-matrix-daily';
import { listTrendingChartTargets } from '../trending/catalog';

const fetchTrendingMock = vi.hoisted(() => vi.fn());

vi.mock('../foundation', () => ({
  fetchTrendingYouTubeVideos: fetchTrendingMock,
}));

describe('collectTrendingMatrixDaily', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchTrendingMock.mockResolvedValue({
      data: {
        date: '2026-05-22',
        regionCode: 'KR',
        categoryId: '22',
        videos: [{ videoId: 'v1' }],
        source: 'youtube_trending',
        unitsConsumed: 1,
        quotaSessionId: null,
      },
      warnings: [],
      harvest: { id: 'harvest-1', status: 'success', resultCount: 1 },
      collectedAt: '2026-05-22T00:00:00Z',
    });
  });

  it('collects all KR assignable category targets without auto-analysis', async () => {
    const targets = listTrendingChartTargets();
    const result = await collectTrendingMatrixDaily({
      date: '2026-05-22',
      limit: 50,
    });

    expect(fetchTrendingMock).toHaveBeenCalledTimes(targets.length);
    expect(result.data.totalTargets).toBe(14);
    expect(result.data.successCount).toBe(14);
    expect(result.data.failedCount).toBe(0);
    expect(result.data.totalUnitsConsumed).toBe(14);

    for (const call of fetchTrendingMock.mock.calls) {
      expect(call[0]).toMatchObject({ persist: true, limit: 50, date: '2026-05-22' });
      expect(call[0].categoryId).toBeTruthy();
    }
  });

  it('reports partial failure when a target throws', async () => {
    fetchTrendingMock.mockImplementation(
      async (input: { categoryId: string | null }) => {
        if (input.categoryId === '22') {
          throw new Error('quota exceeded');
        }
        return {
          data: {
            date: '2026-05-22',
            regionCode: 'KR',
            categoryId: input.categoryId,
            videos: [],
            source: 'youtube_trending',
            unitsConsumed: 1,
            quotaSessionId: null,
          },
          warnings: [],
          harvest: null,
          collectedAt: '2026-05-22T00:00:00Z',
        };
      },
    );

    const result = await collectTrendingMatrixDaily({ date: '2026-05-22', limit: 50 });
    expect(result.data.failedCount).toBe(1);
    expect(result.data.successCount).toBe(13);
    expect(result.warnings[0]?.code).toBe('TRENDING_MATRIX_PARTIAL_FAILURE');
    const failed = result.data.targets.find((t) => t.categoryId === '22');
    expect(failed?.status).toBe('failed');
    expect(failed?.error).toContain('quota');
  });
});
