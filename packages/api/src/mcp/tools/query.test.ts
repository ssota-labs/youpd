import { describe, expect, it, vi } from 'vitest';
import { keywordSummary, queryKeywordSearch, videoCandidateLookup } from './query';

const videoRow = {
  videoId: 'v1',
  channelId: 'c1',
  title: 'A strong video',
  description: '',
  thumbnails: { high: { url: 'https://img.example/v1.jpg' } },
  durationSec: 300,
  viewCount: 1_000_000,
  likeCount: 10_000,
  commentCount: 500,
  tags: [],
  categoryId: null,
  defaultAudioLanguage: null,
  url: 'https://youtube.com/watch?v=v1',
  publishedAt: new Date('2026-05-01T00:00:00Z'),
  firstSeenAt: new Date('2026-05-18T00:00:00Z'),
  lastSeenAt: new Date('2026-05-18T00:00:00Z'),
};

const channelRow = {
  channelId: 'c1',
  title: 'Channel',
  description: '',
  thumbnails: {},
  subscriberCount: 50_000,
  viewCount: 10_000_000,
  videoCount: 100,
  averageViewCount: 25_000,
  hiddenSubscriberCount: false,
  uploadsPlaylistId: null,
  country: null,
  url: 'https://youtube.com/channel/c1',
  publishedAt: null,
  firstSeenAt: new Date('2026-05-18T00:00:00Z'),
  lastSeenAt: new Date('2026-05-18T00:00:00Z'),
};

vi.mock('@youpd/supabase/repositories/youtube', () => ({
  getLatestKeywordVideos: async () => [
    { video: videoRow, channel: channelRow, position: 0 },
  ],
  getVideosByIds: async () => [{ video: videoRow, channel: channelRow }],
}));

describe('keywordSummary', () => {
  it('summarizes canonical keyword rows with score distribution', async () => {
    const out = await keywordSummary({ keywords: ['퇴사'], limit: 300 });
    expect(out.keywords[0]!.summary.videoCount).toBe(1);
    expect(out.keywords[0]!.summary.totalViewCount).toBe(1_000_000);
    expect(out.keywords[0]!.scoreDistribution.performance.Good).toBe(1);
    expect(out.keywords[0]!.scoreDistribution.highPerforming.GoodOrGreatBoth).toBe(1);
  });
});

describe('queryKeywordSearch', () => {
  it('returns high-performing videos with computed score fields', async () => {
    const out = await queryKeywordSearch({
      keywords: ['퇴사'],
      limit: 50,
      minPerformanceGrade: 'Good',
      minContributionGrade: 'Good',
      sort: 'length_adjusted_score_desc',
    });
    expect(out.keywords[0]!.videos).toHaveLength(1);
    expect(out.keywords[0]!.videos[0]!.thumbnailUrl).toBe('https://img.example/v1.jpg');
    expect(out.keywords[0]!.videos[0]!.performance.grade).toBe('Good');
  });
});

describe('videoCandidateLookup', () => {
  it('preserves requested ids that are found', async () => {
    const out = await videoCandidateLookup({ videoIds: ['v1'] });
    expect(out.videos.map((v) => v.videoId)).toEqual(['v1']);
  });
});
