import {
  upsertChannels,
  upsertHotVideos,
  upsertVideos,
} from '@youpd/supabase/repositories/youtube';
import {
  E2E_HOT_VIDEO_TITLES,
  getTodayInKorea,
} from './hot-videos-fixtures';
import { loadSupabaseEnv } from './load-supabase-env';

loadSupabaseEnv();

const CHANNEL_ID = 'UC-e2e-hot-videos';
const VIDEO_ID_GAMING = 'e2e-hot-video-cat20';
const VIDEO_ID_VLOG = 'e2e-hot-video-cat22';
const EXTRA_VIDEO_COUNT = 28;

export async function seedHotVideosForE2E(): Promise<void> {
  const hotDate = getTodayInKorea();

  await upsertChannels([
    {
      channelId: CHANNEL_ID,
      title: 'E2E Hot Videos Channel',
      subscriberCount: 10_000,
      averageViewCount: 5_000,
      url: `https://www.youtube.com/channel/${CHANNEL_ID}`,
    },
  ]);

  const extraVideos = Array.from({ length: EXTRA_VIDEO_COUNT }, (_, index) => {
    const number = index + 3;
    return {
      videoId: `e2e-hot-video-${number}`,
      channelId: CHANNEL_ID,
      title:
        number === 30
          ? E2E_HOT_VIDEO_TITLES.last
          : `E2E Hot Video ${number}`,
      views: 30_000 - number,
      durationSec: 180 + number,
      isShort: false,
      categoryId: number % 2 === 0 ? '20' : '22',
      url: `https://www.youtube.com/watch?v=e2e-hot-video-${number}`,
    };
  });

  await upsertVideos([
    {
      videoId: VIDEO_ID_GAMING,
      channelId: CHANNEL_ID,
      title: E2E_HOT_VIDEO_TITLES.gaming,
      views: 50_000,
      durationSec: 600,
      isShort: false,
      categoryId: '20',
      url: `https://www.youtube.com/watch?v=${VIDEO_ID_GAMING}`,
    },
    {
      videoId: VIDEO_ID_VLOG,
      channelId: CHANNEL_ID,
      title: E2E_HOT_VIDEO_TITLES.vlog,
      views: 30_000,
      durationSec: 120,
      isShort: false,
      categoryId: '22',
      url: `https://www.youtube.com/watch?v=${VIDEO_ID_VLOG}`,
    },
    ...extraVideos,
  ]);

  await upsertHotVideos([
    {
      hotDate,
      regionCode: 'KR',
      categoryId: '20',
      videoId: VIDEO_ID_GAMING,
      rank: 1,
      source: 'youtube_trending',
    },
    {
      hotDate,
      regionCode: 'KR',
      categoryId: '22',
      videoId: VIDEO_ID_VLOG,
      rank: 2,
      source: 'youtube_trending',
    },
    ...extraVideos.map((video, index) => ({
      hotDate,
      regionCode: 'KR',
      categoryId: video.categoryId,
      videoId: video.videoId,
      rank: index + 3,
      source: 'youtube_trending',
    })),
  ]);
}

seedHotVideosForE2E()
  .then(() => {
    console.log(`Seeded hot videos for ${getTodayInKorea()} (KST)`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
