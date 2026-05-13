import { describe, expect, it } from 'vitest';
import {
  normaliseChannel,
  normaliseCommentThread,
  normaliseVideo,
  parseIsoDuration,
  RawChannelSchema,
  RawCommentThreadSchema,
  RawVideoSchema,
} from './schemas';

describe('parseIsoDuration', () => {
  it('parses hours, minutes, seconds', () => {
    expect(parseIsoDuration('PT1H2M3S')).toBe(3_600 + 120 + 3);
  });
  it('parses minutes only', () => {
    expect(parseIsoDuration('PT4M13S')).toBe(4 * 60 + 13);
  });
  it('returns null on garbage', () => {
    expect(parseIsoDuration('garbage')).toBeNull();
  });
  it('returns null on undefined', () => {
    expect(parseIsoDuration(undefined)).toBeNull();
  });
});

describe('normaliseVideo', () => {
  it('produces canonical url and duration', () => {
    const raw = RawVideoSchema.parse({
      id: 'abc',
      snippet: {
        publishedAt: '2024-01-01T00:00:00Z',
        channelId: 'ch1',
        title: 'Title',
        description: '',
        thumbnails: {},
        channelTitle: 'Ch',
      },
      contentDetails: { duration: 'PT5M' },
      statistics: { viewCount: '1234', likeCount: '12', commentCount: '3' },
    });
    const v = normaliseVideo(raw);
    expect(v.videoId).toBe('abc');
    expect(v.url).toBe('https://www.youtube.com/watch?v=abc');
    expect(v.durationSeconds).toBe(300);
    expect(v.views).toBe(1234);
    expect(v.likes).toBe(12);
    expect(v.comments).toBe(3);
  });

  it('handles missing statistics gracefully', () => {
    const raw = RawVideoSchema.parse({
      id: 'abc',
      snippet: {
        publishedAt: '2024-01-01T00:00:00Z',
        channelId: 'ch1',
        title: 'Title',
        description: '',
        thumbnails: {},
        channelTitle: 'Ch',
      },
    });
    const v = normaliseVideo(raw);
    expect(v.views).toBeNull();
    expect(v.likes).toBeNull();
    expect(v.durationSeconds).toBeNull();
  });
});

describe('normaliseChannel', () => {
  it('hides subscriber count when hiddenSubscriberCount is true', () => {
    const raw = RawChannelSchema.parse({
      id: 'ch1',
      snippet: {
        title: 'Ch',
        description: '',
        publishedAt: '2024-01-01T00:00:00Z',
        thumbnails: {},
      },
      statistics: {
        subscriberCount: '999',
        videoCount: '10',
        viewCount: '1000',
        hiddenSubscriberCount: true,
      },
      contentDetails: { relatedPlaylists: { uploads: 'UU123' } },
    });
    const c = normaliseChannel(raw);
    expect(c.subscriberCount).toBeNull();
    expect(c.hiddenSubscriberCount).toBe(true);
    expect(c.uploadsPlaylistId).toBe('UU123');
  });
});

describe('normaliseCommentThread', () => {
  it('extracts top-level comment and likeCount', () => {
    const raw = RawCommentThreadSchema.parse({
      id: 't1',
      snippet: {
        videoId: 'v1',
        totalReplyCount: 2,
        topLevelComment: {
          id: 'c1',
          snippet: {
            authorDisplayName: 'A',
            authorChannelId: { value: 'AC' },
            textDisplay: '<b>hi</b>',
            textOriginal: 'hi',
            likeCount: 7,
            publishedAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        },
      },
    });
    const c = normaliseCommentThread(raw);
    expect(c.commentId).toBe('c1');
    expect(c.text).toBe('hi');
    expect(c.likeCount).toBe(7);
    expect(c.totalReplyCount).toBe(2);
    expect(c.authorChannelId).toBe('AC');
  });
});
