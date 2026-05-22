import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkflowDeps } from './deps';
import { ensureVideoAnalysis } from './ensure-video-analysis';
import { getStoredTrendingVideos } from './get-stored-trending-videos';
import { searchStoredHotVideos } from './search-stored-hot-videos';

function createMockDeps(overrides: Partial<WorkflowDeps> = {}): WorkflowDeps {
  return {
    source: {
      searchVideos: vi.fn(),
      fetchVideoDetail: vi.fn(),
      fetchChannelDetail: vi.fn(),
      fetchChannelVideos: vi.fn(),
      fetchTrending: vi.fn(),
    },
    trending: {
      queryHotVideos: vi.fn(),
      searchHotVideos: vi.fn(),
    },
    snapshots: {
      captureVideoAndChannelSnapshots: vi.fn(),
      listAllVideoIds: vi.fn(),
      listAllChannelIds: vi.fn(),
    },
    policy: {
      maxChannelVideos: () => 500,
      topPerformingVideoLimit: () => 10,
      keywordAnalysisLimit: () => 50,
      trendingAutoAnalyzeLimit: () => 10,
      defaultCommentsTopN: () => 50,
      snapshotSource: () => 'test_workflow',
    },
    clock: {
      todayYmd: () => '2026-05-22',
      nowIso: () => '2026-05-22T00:00:00.000Z',
    },
    ...overrides,
  };
}

describe('ensureVideoAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns scored video analysis with snapshots', async () => {
    const deps = createMockDeps();
    deps.source.fetchVideoDetail = vi.fn().mockResolvedValue({
      video: {
        id: 'vid-1',
        provider: 'youtube',
        title: 'Test Video',
        channelId: 'chan-1',
        channelTitle: 'Test Channel',
        publishedAt: '2026-01-01T00:00:00.000Z',
        durationSec: 600,
        metrics: { views: 1000, likes: 100, comments: 10 },
        url: 'https://youtube.com/watch?v=vid-1',
        thumbnailUrl: null,
      },
      channel: {
        id: 'chan-1',
        provider: 'youtube',
        title: 'Test Channel',
        thumbnailUrl: null,
        publishedAt: null,
        subscriberCount: 10000,
        videoCount: 20,
        averageViewCount: 500,
        uploadsPlaylistId: null,
        url: 'https://youtube.com/channel/chan-1',
      },
      comments: [],
      commentsDisabled: false,
    });
    deps.snapshots.captureVideoAndChannelSnapshots = vi.fn().mockResolvedValue({
      videoSnapshots: [
        {
          snapshotDate: '2026-05-22',
          videoId: 'vid-1',
          viewCount: 1000,
          likeCount: 100,
          commentCount: 10,
          source: 'test_workflow',
        },
      ],
      channelSnapshots: [],
      missingVideoIds: [],
      missingChannelIds: [],
    });

    const result = await ensureVideoAnalysis(
      { videoId: 'vid-1', includeComments: true, commentsTopN: 10 },
      deps,
    );

    expect(result.data.video.id).toBe('vid-1');
    expect(result.data.video.score.adjustedScore).not.toBeNull();
    expect(result.data.snapshots.videoSnapshots).toHaveLength(1);
    expect(deps.snapshots.captureVideoAndChannelSnapshots).toHaveBeenCalledWith({
      snapshotDate: '2026-05-22',
      videoIds: ['vid-1'],
      channelIds: ['chan-1'],
      source: 'test_workflow',
    });
  });
});

describe('getStoredTrendingVideos', () => {
  it('returns a missing-data warning when no rows exist', async () => {
    const deps = createMockDeps();
    deps.trending.queryHotVideos = vi.fn().mockResolvedValue([]);

    const result = await getStoredTrendingVideos(
      {
        date: '2026-05-22',
        regionCode: 'KR',
        limit: 10,
      },
      deps,
    );

    expect(result.data.videos).toEqual([]);
    expect(result.warnings[0]?.code).toBe('TRENDING_DATA_NOT_FOUND');
  });
});

describe('searchStoredHotVideos', () => {
  it('returns no-results warning when search is empty', async () => {
    const deps = createMockDeps();
    deps.trending.searchHotVideos = vi.fn().mockResolvedValue({
      rows: [],
      total: 0,
      hasMore: false,
    });

    const result = await searchStoredHotVideos(
      {
        regionCode: 'KR',
        page: 1,
        limit: 24,
      },
      deps,
    );

    expect(result.data.videos).toEqual([]);
    expect(result.data.total).toBe(0);
    expect(result.warnings.some((w) => w.code === 'TRENDING_SEARCH_NO_RESULTS')).toBe(
      true,
    );
  });

  it('flags incomplete score data as Unknown', async () => {
    const deps = createMockDeps();
    deps.trending.searchHotVideos = vi.fn().mockResolvedValue({
      rows: [
        {
          hotDate: '2026-05-22',
          rank: 1,
          categoryId: '22',
          regionCode: 'KR',
          video: {
            id: 'vid-1',
            provider: 'youtube',
            title: 'Hot Video',
            channelId: 'chan-1',
            channelTitle: 'Channel',
            publishedAt: null,
            durationSec: 600,
            metrics: { views: 1000, likes: 100, comments: 10 },
            url: 'https://youtube.com/watch?v=vid-1',
            thumbnailUrl: null,
            score: {
              performance: { ratio: null, grade: 'Unknown' },
              contribution: { ratio: null, grade: 'Unknown' },
              lengthAdjustment: {
                baseScore: null,
                durationSec: 600,
                referenceDurationSec: 600,
                weight: 1,
                adjustedScore: null,
              },
              highPerforming: false,
              adjustedScore: null,
            },
          },
          channel: {
            id: 'chan-1',
            provider: 'youtube',
            title: 'Channel',
            thumbnailUrl: null,
            publishedAt: null,
            subscriberCount: null,
            videoCount: null,
            averageViewCount: null,
            uploadsPlaylistId: null,
            url: 'https://youtube.com/channel/chan-1',
          },
        },
      ],
      total: 1,
      hasMore: false,
    });

    const result = await searchStoredHotVideos(
      {
        regionCode: 'KR',
        page: 1,
        limit: 24,
      },
      deps,
    );

    expect(result.data.videos).toHaveLength(1);
    expect(result.warnings.some((w) => w.code === 'SCORE_DATA_INCOMPLETE')).toBe(
      true,
    );
  });

  it('passes sort and order to the trending repository', async () => {
    const deps = createMockDeps();
    deps.trending.searchHotVideos = vi.fn().mockResolvedValue({
      rows: [],
      total: 0,
      hasMore: false,
    });

    await searchStoredHotVideos(
      {
        regionCode: 'KR',
        page: 1,
        limit: 24,
        sort: 'views',
        order: 'asc',
      },
      deps,
    );

    expect(deps.trending.searchHotVideos).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: 'views',
        order: 'asc',
      }),
    );
  });
});
