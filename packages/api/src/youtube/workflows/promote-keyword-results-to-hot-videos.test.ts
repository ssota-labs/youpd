import { beforeEach, describe, expect, it, vi } from 'vitest';
import { promoteKeywordResultsToHotVideos } from './promote-keyword-results-to-hot-videos';

const repoMocks = vi.hoisted(() => ({
  queryPromotableKeywordResults: vi.fn(),
  upsertHotVideos: vi.fn(),
}));

vi.mock('@youpd/supabase/repositories/youtube', () => ({
  HOT_VIDEO_SOURCE_KEYWORD_PROMOTED: 'keyword_promoted',
  queryPromotableKeywordResults: repoMocks.queryPromotableKeywordResults,
  upsertHotVideos: repoMocks.upsertHotVideos,
}));

describe('promoteKeywordResultsToHotVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repoMocks.queryPromotableKeywordResults.mockResolvedValue([]);
    repoMocks.upsertHotVideos.mockResolvedValue(undefined);
  });

  it('promotes yesterday keyword results with Good+ performance and contribution', async () => {
    repoMocks.queryPromotableKeywordResults.mockResolvedValue([
      {
        videoId: 'vid-1',
        regionCode: 'KR',
        categoryId: '26',
        keyword: '엑셀 자동화',
        keywordRank: 2,
        performanceRatio: 15,
        contributionRatio: 12,
      },
    ]);

    const result = await promoteKeywordResultsToHotVideos(
      { regionCode: 'KR', hotDate: '2026-05-23' },
      {
        source: {} as never,
        trending: {} as never,
        snapshots: {} as never,
        policy: {} as never,
        clock: {
          todayYmd: () => '2026-05-23',
          nowIso: () => '2026-05-23T00:00:00.000Z',
        },
      },
    );

    expect(repoMocks.queryPromotableKeywordResults).toHaveBeenCalledWith({
      collectedDate: '2026-05-22',
      regionCode: 'KR',
    });
    expect(repoMocks.upsertHotVideos).toHaveBeenCalledWith([
      {
        hotDate: '2026-05-23',
        regionCode: 'KR',
        categoryId: '26',
        videoId: 'vid-1',
        rank: 1,
        source: 'keyword_promoted',
      },
    ]);
    expect(result.data.promotedCount).toBe(1);
  });

  it('skips upsert when no candidates qualify', async () => {
    await promoteKeywordResultsToHotVideos(
      { regionCode: 'KR', hotDate: '2026-05-23' },
      {
        source: {} as never,
        trending: {} as never,
        snapshots: {} as never,
        policy: {} as never,
        clock: {
          todayYmd: () => '2026-05-23',
          nowIso: () => '2026-05-23T00:00:00.000Z',
        },
      },
    );

    expect(repoMocks.upsertHotVideos).not.toHaveBeenCalled();
  });
});
