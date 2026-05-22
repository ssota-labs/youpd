import { describe, expect, it } from 'vitest';
import {
  queryHotVideos,
  searchHotVideos,
  upsertChannels,
  upsertHotVideos,
  upsertVideos,
} from './youtube';

const HOT_DATE = '2099-06-01';
const REGION = 'KR';
const CATEGORY = '22';
const CHANNEL_ID = 'UC-youpd-integration';
const VIDEO_ID = 'youpd-integration-hot-1';

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

  it('searches by video title and channel title with pagination', async () => {
    const channelSearchId = `${CHANNEL_ID}-search`;
    const videoSearchId = `${VIDEO_ID}-search`;

    await upsertChannels([
      {
        channelId: channelSearchId,
        title: 'Unique Searchable Channel Name',
        url: `https://www.youtube.com/channel/${channelSearchId}`,
      },
    ]);

    await upsertVideos([
      {
        videoId: videoSearchId,
        channelId: channelSearchId,
        title: 'Unique Searchable Video Title',
        views: 2000,
        url: `https://www.youtube.com/watch?v=${videoSearchId}`,
      },
    ]);

    await upsertHotVideos([
      {
        hotDate: HOT_DATE,
        regionCode: REGION,
        categoryId: CATEGORY,
        videoId: videoSearchId,
        rank: 2,
        source: 'integration_test',
      },
    ]);

    const byTitle = await searchHotVideos({
      regionCode: REGION,
      q: 'Searchable Video',
      limit: 10,
      offset: 0,
    });
    expect(byTitle.rows.some((row) => row.video?.videoId === videoSearchId)).toBe(
      true,
    );

    const byChannel = await searchHotVideos({
      regionCode: REGION,
      q: 'Searchable Channel',
      limit: 10,
      offset: 0,
    });
    expect(
      byChannel.rows.some((row) => row.channel?.channelId === channelSearchId),
    ).toBe(true);

    const paged = await searchHotVideos({
      regionCode: REGION,
      date: HOT_DATE,
      categoryId: CATEGORY,
      limit: 1,
      offset: 0,
    });
    expect(paged.total).toBeGreaterThanOrEqual(2);
    expect(paged.rows).toHaveLength(1);
    expect(paged.hasMore).toBe(true);
  });

  it('sorts by video view count descending', async () => {
    const lowViewsId = `${VIDEO_ID}-sort-low`;
    const highViewsId = `${VIDEO_ID}-sort-high`;
    const sortChannelId = `${CHANNEL_ID}-sort`;

    await upsertChannels([
      {
        channelId: sortChannelId,
        title: 'Sort Test Channel',
        url: `https://www.youtube.com/channel/${sortChannelId}`,
      },
    ]);

    await upsertVideos([
      {
        videoId: lowViewsId,
        channelId: sortChannelId,
        title: 'Sort Low Views Video',
        views: 100,
        url: `https://www.youtube.com/watch?v=${lowViewsId}`,
      },
      {
        videoId: highViewsId,
        channelId: sortChannelId,
        title: 'Sort High Views Video',
        views: 5000,
        url: `https://www.youtube.com/watch?v=${highViewsId}`,
      },
    ]);

    await upsertHotVideos([
      {
        hotDate: HOT_DATE,
        regionCode: REGION,
        categoryId: CATEGORY,
        videoId: lowViewsId,
        rank: 1,
        source: 'integration_test',
      },
      {
        hotDate: HOT_DATE,
        regionCode: REGION,
        categoryId: CATEGORY,
        videoId: highViewsId,
        rank: 2,
        source: 'integration_test',
      },
    ]);

    const sorted = await searchHotVideos({
      regionCode: REGION,
      date: HOT_DATE,
      categoryId: CATEGORY,
      sort: 'views',
      order: 'desc',
      limit: 10,
      offset: 0,
    });

    const ids = sorted.rows.map((row) => row.video?.videoId);
    expect(ids.indexOf(highViewsId)).toBeLessThan(ids.indexOf(lowViewsId));
  });
});
