import { describe, expect, it } from 'vitest';
import {
  queryHotVideos,
  upsertChannels,
  upsertHotVideos,
  upsertVideos,
} from './youtube';

const HOT_DATE = '2099-06-01';
const REGION = 'KR';
const CATEGORY = '22';
const CHANNEL_ID = 'UC-youpd-integration';
const VIDEO_ID = 'youpd-integration-hot-1';
const SHORT_VIDEO_ID = 'youpd-integration-hot-short';

describe('youtube hot videos repository (integration)', () => {
  it('upserts channel, video, hot row and reads them back', async () => {
    await upsertChannels([
      {
        channelId: CHANNEL_ID,
        title: 'Integration Test Channel',
        url: `https://www.youtube.com/channel/${CHANNEL_ID}`,
      },
    ]);

    await upsertVideos([
      {
        videoId: VIDEO_ID,
        channelId: CHANNEL_ID,
        title: 'Integration Hot Video',
        views: 1000,
        url: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
      },
    ]);

    await upsertHotVideos([
      {
        hotDate: HOT_DATE,
        regionCode: REGION,
        categoryId: CATEGORY,
        videoId: VIDEO_ID,
        rank: 1,
        source: 'integration_test',
      },
    ]);

    const rows = await queryHotVideos({
      date: HOT_DATE,
      regionCode: REGION,
      categoryId: CATEGORY,
      limit: 10,
    });

    expect(rows.some((row) => row.hotVideo.videoId === VIDEO_ID)).toBe(true);
    const match = rows.find((row) => row.hotVideo.videoId === VIDEO_ID);
    expect(match?.video?.title).toBe('Integration Hot Video');
    expect(match?.channel?.channelId).toBe(CHANNEL_ID);
    expect(match?.hotVideo.source).toBe('integration_test');
  });

  it('persists is_short from duration on upsert and update', async () => {
    await upsertChannels([
      {
        channelId: CHANNEL_ID,
        title: 'Integration Test Channel',
        url: `https://www.youtube.com/channel/${CHANNEL_ID}`,
      },
    ]);

    const [shortRow] = await upsertVideos([
      {
        videoId: SHORT_VIDEO_ID,
        channelId: CHANNEL_ID,
        title: 'Short Hot Video',
        durationSec: 45,
        url: `https://www.youtube.com/watch?v=${SHORT_VIDEO_ID}`,
      },
    ]);
    expect(shortRow?.isShort).toBe(true);

    const [longRow] = await upsertVideos([
      {
        videoId: SHORT_VIDEO_ID,
        channelId: CHANNEL_ID,
        title: 'Now Long Hot Video',
        durationSec: 90,
        url: `https://www.youtube.com/watch?v=${SHORT_VIDEO_ID}`,
      },
    ]);
    expect(longRow?.isShort).toBe(false);
  });
});
