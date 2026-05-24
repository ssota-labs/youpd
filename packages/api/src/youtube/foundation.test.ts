import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FetchTrendingYouTubeVideosInputSchema,
  SearchYouTubeVideosInputSchema,
  fetchTrendingYouTubeVideos,
  searchYouTubeVideos,
} from './foundation';

const mocks = vi.hoisted(() => ({
  searchKeyword: vi.fn(),
  getVideoDetail: vi.fn(),
  getChannelOverview: vi.fn(),
  getChannelAllVideos: vi.fn(),
  getVideoComments: vi.fn(),
  fetchHotChart: vi.fn(),
  fetchChannelsBatch: vi.fn(),
  snapshotNow: vi.fn(),
  snapshotChannelsNow: vi.fn(),
  createHarvestSession: vi.fn(),
  completeHarvestSession: vi.fn(),
  upsertChannels: vi.fn(),
  upsertVideos: vi.fn(),
  upsertKeywordResults: vi.fn(),
  upsertKeywordCache: vi.fn(),
  getFreshKeywordCache: vi.fn(),
  upsertHotVideos: vi.fn(),
  upsertVideoMetricSnapshots: vi.fn(),
  upsertChannelMetricSnapshots: vi.fn(),
  updateChannelAverageViewCount: vi.fn(),
  queryHotVideos: vi.fn(),
  getKeywordSummary: vi.fn(),
  getChannelSummary: vi.fn(),
  queryVideoMetricSnapshots: vi.fn(),
  queryChannelMetricSnapshots: vi.fn(),
}));

vi.mock('../mcp/tools/index', () => ({
  searchKeyword: mocks.searchKeyword,
  getVideoDetail: mocks.getVideoDetail,
  getChannelOverview: mocks.getChannelOverview,
  getChannelAllVideos: mocks.getChannelAllVideos,
  getVideoComments: mocks.getVideoComments,
  fetchHotChart: mocks.fetchHotChart,
  fetchChannelsBatch: mocks.fetchChannelsBatch,
  snapshotNow: mocks.snapshotNow,
  snapshotChannelsNow: mocks.snapshotChannelsNow,
}));

vi.mock('@youpd/supabase/repositories/youtube', () => ({
  createHarvestSession: mocks.createHarvestSession,
  completeHarvestSession: mocks.completeHarvestSession,
  upsertChannels: mocks.upsertChannels,
  upsertVideos: mocks.upsertVideos,
  upsertKeywordResults: mocks.upsertKeywordResults,
  upsertKeywordCache: mocks.upsertKeywordCache,
  getFreshKeywordCache: mocks.getFreshKeywordCache,
  upsertHotVideos: mocks.upsertHotVideos,
  upsertVideoMetricSnapshots: mocks.upsertVideoMetricSnapshots,
  upsertChannelMetricSnapshots: mocks.upsertChannelMetricSnapshots,
  updateChannelAverageViewCount: mocks.updateChannelAverageViewCount,
  queryHotVideos: mocks.queryHotVideos,
  getKeywordSummary: mocks.getKeywordSummary,
  getChannelSummary: mocks.getChannelSummary,
  queryVideoMetricSnapshots: mocks.queryVideoMetricSnapshots,
  queryChannelMetricSnapshots: mocks.queryChannelMetricSnapshots,
}));

describe('fetchTrendingYouTubeVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createHarvestSession.mockResolvedValue({ id: 'harvest-trending' });
    mocks.completeHarvestSession.mockResolvedValue({ id: 'harvest-trending' });
    mocks.upsertChannels.mockResolvedValue([]);
    mocks.upsertVideos.mockResolvedValue([]);
    mocks.upsertHotVideos.mockResolvedValue(undefined);
    mocks.fetchChannelsBatch.mockResolvedValue({
      channels: [
        {
          channelId: 'c1',
          title: 'Channel',
          description: '',
          publishedAt: '2025-01-01T00:00:00Z',
          thumbnails: { high: { url: 'https://img.example/thumb.jpg' } },
          subscriberCount: 1000,
          videoCount: 10,
          viewCount: 50000,
          hiddenSubscriberCount: false,
          uploadsPlaylistId: 'UU1',
          country: 'KR',
          url: 'https://www.youtube.com/channel/c1',
        },
      ],
      missing_channel_ids: [],
      units_consumed: 1,
    });
    mocks.fetchHotChart.mockResolvedValue({
      region_code: 'KR',
      category_id: '22',
      fetched_at: '2026-05-22T12:00:00.000Z',
      source: 'chart=mostPopular',
      videos: [
        {
          videoId: 'v1',
          title: 'Trending',
          description: '',
          channelId: 'c1',
          channelTitle: 'Channel',
          publishedAt: '2026-05-01T00:00:00Z',
          thumbnails: {},
          durationSeconds: 600,
          views: 5000,
          likes: 100,
          comments: 10,
          tags: [],
          categoryId: '22',
          defaultAudioLanguage: null,
          url: 'https://www.youtube.com/watch?v=v1',
        },
      ],
      units_consumed: 1,
    });
  });

  it('calls fetchHotChart with persist false and writes via harvest path only', async () => {
    await fetchTrendingYouTubeVideos({
      date: '2026-05-22',
      regionCode: 'KR',
      categoryId: '22',
      limit: 50,
      persist: true,
    });

    expect(mocks.fetchHotChart).toHaveBeenCalledWith({
      region_code: 'KR',
      category_id: '22',
      limit: 50,
      persist: false,
    });
    expect(mocks.fetchChannelsBatch).toHaveBeenCalledWith({ channel_ids: ['c1'] });
    expect(mocks.upsertChannels).toHaveBeenCalledWith([
      expect.objectContaining({
        channelId: 'c1',
        subscriberCount: 1000,
        viewCount: 50000,
        videoCount: 10,
        averageViewCount: 5000,
      }),
    ]);
    expect(mocks.upsertHotVideos).toHaveBeenCalledWith([
      expect.objectContaining({
        hotDate: '2026-05-22',
        regionCode: 'KR',
        categoryId: '22',
        videoId: 'v1',
        rank: 1,
        source: 'youtube_trending',
      }),
    ]);
  });
});

describe('FetchTrendingYouTubeVideosInputSchema', () => {
  it('defaults limit to 50', () => {
    const parsed = FetchTrendingYouTubeVideosInputSchema.parse({
      regionCode: 'KR',
    });
    expect(parsed.limit).toBe(50);
    expect(parsed.persist).toBe(true);
  });
});

describe('SearchYouTubeVideosInputSchema', () => {
  it('uses v0.12 defaults', () => {
    const parsed = SearchYouTubeVideosInputSchema.parse({ keyword: '퇴사' });
    expect(parsed.limit).toBe(50);
    expect(parsed.regionCode).toBe('KR');
    expect(parsed.persist).toBe(true);
    expect(parsed.includeScore).toBe(true);
    expect(parsed.forceRefresh).toBe(false);
    expect(parsed.cacheTtlDays).toBe(7);
  });
});

describe('searchYouTubeVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createHarvestSession.mockResolvedValue({ id: 'harvest-1' });
    mocks.completeHarvestSession.mockResolvedValue({ id: 'harvest-1' });
    mocks.upsertChannels.mockResolvedValue([]);
    mocks.upsertVideos.mockResolvedValue([]);
    mocks.upsertKeywordResults.mockResolvedValue(undefined);
    mocks.upsertKeywordCache.mockResolvedValue({ id: 'keyword-1' });
    mocks.getFreshKeywordCache.mockResolvedValue(null);
    mocks.searchKeyword.mockResolvedValue({
      keyword: '퇴사',
      videos: [
        {
          videoId: 'v1',
          title: 'T',
          description: '',
          channelId: 'c1',
          channelTitle: 'C',
          publishedAt: '2026-05-01T00:00:00Z',
          thumbnails: {},
          durationSeconds: 600,
          views: 1000,
          likes: 10,
          comments: 2,
          tags: [],
          categoryId: null,
          defaultAudioLanguage: null,
          url: 'https://www.youtube.com/watch?v=v1',
        },
      ],
      channels: [
        {
          channelId: 'c1',
          title: 'C',
          description: '',
          publishedAt: '2025-01-01T00:00:00Z',
          thumbnails: {},
          subscriberCount: 100,
          videoCount: 10,
          viewCount: 5000,
          hiddenSubscriberCount: false,
          uploadsPlaylistId: 'UU1',
          country: 'KR',
          url: 'https://www.youtube.com/channel/c1',
        },
      ],
      units_consumed: 102,
      quota_session_id: 'quota-1',
    });
  });

  it('persists canonical rows with a harvest id', async () => {
    const out = await searchYouTubeVideos({
      keyword: '퇴사',
      limit: 10,
      regionCode: 'KR',
      order: 'relevance',
      persist: true,
      includeScore: true,
      forceRefresh: false,
      cacheTtlDays: 7,
    });

    expect(out.harvest).toEqual({
      id: 'harvest-1',
      status: 'success',
      resultCount: 1,
    });
    expect(mocks.upsertChannels).toHaveBeenCalledWith([
      expect.objectContaining({
        channelId: 'c1',
        averageViewCount: 500,
        averageViewCountBasis: { method: 'channel_lifetime_ratio' },
      }),
    ]);
    expect(mocks.upsertVideos).toHaveBeenCalledOnce();
    expect(mocks.upsertKeywordResults).toHaveBeenCalledWith([
      expect.objectContaining({ harvestId: 'harvest-1', videoId: 'v1' }),
    ]);
    expect(mocks.upsertKeywordCache).toHaveBeenCalledWith(
      expect.objectContaining({
        keyword: '퇴사',
        harvestId: 'harvest-1',
        resultCount: 1,
        ttlDays: 7,
      }),
    );
    expect(out.data.videos[0]).toMatchObject({
      videoId: 'v1',
      performance: { ratio: 10, grade: 'Good' },
      contribution: { ratio: 2, grade: 'Normal' },
    });
  });

  it('skips canonical writes when persist=false', async () => {
    const out = await searchYouTubeVideos({
      keyword: '퇴사',
      limit: 10,
      regionCode: 'KR',
      order: 'relevance',
      persist: false,
      includeScore: false,
      forceRefresh: false,
      cacheTtlDays: 7,
    });

    expect(out.harvest).toBeNull();
    expect(mocks.createHarvestSession).not.toHaveBeenCalled();
    expect(mocks.upsertVideos).not.toHaveBeenCalled();
  });

  it('returns a fresh weekly keyword cache without calling YouTube', async () => {
    mocks.getFreshKeywordCache.mockResolvedValue({
      keyword: {
        id: 'keyword-1',
        lastHarvestId: 'harvest-1',
        lastCollectedAt: new Date('2026-05-21T00:00:00Z'),
        cacheExpiresAt: new Date('2026-05-28T00:00:00Z'),
      },
      results: [
        {
          result: { rank: 1 },
          video: {
            videoId: 'v1',
            title: 'Cached',
            description: '',
            channelId: 'c1',
            publishedAt: new Date('2026-05-01T00:00:00Z'),
            thumbnailUrl: null,
            durationSec: 600,
            viewCount: 1000,
            likeCount: 10,
            commentCount: 2,
            categoryId: null,
            tags: [],
            defaultAudioLanguage: null,
            videoUrl: 'https://www.youtube.com/watch?v=v1',
          },
          channel: {
            channelId: 'c1',
            title: 'C',
            description: '',
            publishedAt: new Date('2025-01-01T00:00:00Z'),
            thumbnailUrl: null,
            subscriberCount: 100,
            videoCount: 10,
            viewCount: 5000,
            hiddenSubscriberCount: false,
            averageViewCount: null,
            uploadsPlaylistId: 'UU1',
            country: 'KR',
            url: 'https://www.youtube.com/channel/c1',
          },
        },
      ],
    });

    const out = await searchYouTubeVideos({
      keyword: '퇴사',
      limit: 1,
      regionCode: 'KR',
      order: 'relevance',
      persist: true,
      includeScore: false,
      forceRefresh: false,
      cacheTtlDays: 7,
    });

    expect(mocks.searchKeyword).not.toHaveBeenCalled();
    expect(out.harvest).toBeNull();
    expect(out.data).toMatchObject({
      unitsConsumed: 0,
      cache: { hit: true, keywordId: 'keyword-1' },
    });
    expect(out.data.videos[0]).toMatchObject({ videoId: 'v1', title: 'Cached' });
  });
});
