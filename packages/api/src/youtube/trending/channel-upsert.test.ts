import { describe, expect, it } from 'vitest';
import { channelUpsertFromSummary } from './channel-upsert';

describe('channelUpsertFromSummary', () => {
  it('maps channel stats and bootstraps averageViewCount', () => {
    const input = channelUpsertFromSummary({
      channelId: 'c1',
      title: 'Channel',
      description: 'desc',
      publishedAt: '2025-01-01T00:00:00Z',
      thumbnails: { high: { url: 'https://img.example/thumb.jpg' } },
      subscriberCount: 1000,
      videoCount: 10,
      viewCount: 50000,
      hiddenSubscriberCount: false,
      uploadsPlaylistId: 'UU1',
      country: 'KR',
      url: 'https://www.youtube.com/channel/c1',
    });

    expect(input.subscriberCount).toBe(1000);
    expect(input.viewCount).toBe(50000);
    expect(input.videoCount).toBe(10);
    expect(input.thumbnailUrl ?? input.thumbnails?.high?.url).toBeTruthy();
    expect(input.averageViewCount).toBe(5000);
    expect(input.averageViewCountBasis).toEqual({ method: 'channel_lifetime_ratio' });
  });
});
