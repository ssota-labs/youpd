import { currentUsageDay } from '@youpd/supabase/repositories/quota';
import { listActiveKeysWithUsage } from '@youpd/supabase/repositories/youtube-keys';
import type { HomeFeedResponse } from '@youpd/types';

export async function resolveHomeSystemStatus(): Promise<
  HomeFeedResponse['systemStatus']
> {
  const envKey = process.env.YOUTUBE_API_KEY?.trim();
  let youtubeKeys: HomeFeedResponse['systemStatus']['youtubeKeys'] =
    'not_configured';

  try {
    const keys = await listActiveKeysWithUsage(currentUsageDay());
    if (keys.length > 0) {
      const dailyCap = Number(process.env.YOUTUBE_DAILY_QUOTA_UNITS ?? 10_000);
      const exhausted = keys.every((k) => k.unitsConsumedToday >= dailyCap);
      youtubeKeys = exhausted ? 'degraded' : 'healthy';
    } else if (envKey) {
      youtubeKeys = 'healthy';
    }
  } catch {
    youtubeKeys = envKey ? 'healthy' : 'not_configured';
  }

  return {
    youtubeKeys,
    quotaLabel:
      youtubeKeys === 'not_configured'
        ? undefined
        : 'YouTube Data API key pool',
  };
}
