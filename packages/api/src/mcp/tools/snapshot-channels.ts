import { z } from 'zod';
import {
  channelsList,
  normaliseChannel,
  UNIT_COST,
  type YouTubeClient,
} from '@youpd/youtube';
import { executeWithKeyRotation } from '../youtube-key-pool';
import { attachQuotaSession, runWithBudget } from '../quota';

export const SnapshotChannelsInputSchema = z
  .object({
    channel_ids: z.array(z.string().min(1)).min(1).max(500),
  })
  .strict();

export type SnapshotChannelsInput = z.infer<typeof SnapshotChannelsInputSchema>;

export type ChannelDailySnapshot = {
  channel_id: string;
  snapshot_date: string;
  subscribers: number | null;
  view_count: number | null;
  video_count: number | null;
};

export type SnapshotChannelsOutput = {
  snapshots: ChannelDailySnapshot[];
  missing_channel_ids: string[];
  batches: number;
  units_consumed: number;
  quota_session_id?: string;
};

const PT_TZ = 'America/Los_Angeles';

function ptDate(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: PT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(now);
}

/** channels.list in batches of 50; statistics only — 1u per batch. */
export async function snapshotChannelsNow(
  input: SnapshotChannelsInput,
  injectedClient?: YouTubeClient,
): Promise<SnapshotChannelsOutput> {
  const uniqueIds = Array.from(new Set(input.channel_ids));
  const expectedBatches = Math.ceil(uniqueIds.length / 50);
  const upperBoundUnits = expectedBatches * UNIT_COST.channels_list;

  return executeWithKeyRotation(injectedClient ?? null, async (client, keyId) => {
    const { result, sessionId } = await runWithBudget<SnapshotChannelsOutput>({
      operation: 'channel-daily-snapshot',
      units: upperBoundUnits,
      videoIds: uniqueIds,
      keyId,
      call: async () => {
      const res = await channelsList(client, {
        ids: uniqueIds,
        parts: ['snippet', 'statistics', 'contentDetails'],
      });
      const today = ptDate();
      const seen = new Set<string>();
      const snapshots: ChannelDailySnapshot[] = res.items.map((raw) => {
        const ch = normaliseChannel(raw);
        seen.add(ch.channelId);
        return {
          channel_id: ch.channelId,
          snapshot_date: today,
          subscribers: ch.subscriberCount,
          view_count: ch.viewCount,
          video_count: ch.videoCount,
        };
      });
      const missing = uniqueIds.filter((id) => !seen.has(id));

      const payload: SnapshotChannelsOutput = {
        snapshots,
        missing_channel_ids: missing,
        batches: res.batches,
        units_consumed: res.batches * UNIT_COST.channels_list,
      };
      return { resultCount: snapshots.length, payload };
    },
  });

  return attachQuotaSession(result, sessionId);
  });
}
