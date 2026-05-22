import { z } from 'zod';
import {
  channelsList,
  normaliseChannel,
  UNIT_COST,
  type ChannelSummary,
  type YouTubeClient,
} from '@youpd/youtube';
import { executeWithKeyRotation } from '../youtube-key-pool';
import { attachQuotaSession, runWithBudget } from '../quota';

export const FetchChannelsBatchInputSchema = z
  .object({
    channel_ids: z.array(z.string().min(1)).min(1).max(500),
  })
  .strict();

export type FetchChannelsBatchInput = z.infer<typeof FetchChannelsBatchInputSchema>;

export type FetchChannelsBatchOutput = {
  channels: ChannelSummary[];
  missing_channel_ids: string[];
  units_consumed: number;
  quota_session_id?: string;
};

/** channels.list in batches of 50 — 1 unit per batch. */
export async function fetchChannelsBatch(
  input: FetchChannelsBatchInput,
  injectedClient?: YouTubeClient,
): Promise<FetchChannelsBatchOutput> {
  const uniqueIds = Array.from(new Set(input.channel_ids));
  const expectedBatches = Math.ceil(uniqueIds.length / 50);
  const upperBoundUnits = expectedBatches * UNIT_COST.channels_list;

  return executeWithKeyRotation(injectedClient ?? null, async (client, keyId) => {
    const { result, sessionId } = await runWithBudget<FetchChannelsBatchOutput>({
      operation: 'channels-batch',
      units: upperBoundUnits,
      videoIds: uniqueIds,
      keyId,
      call: async () => {
        const res = await channelsList(client, { ids: uniqueIds });
        const seen = new Set<string>();
        const channels = res.items.map((raw) => {
          const channel = normaliseChannel(raw);
          seen.add(channel.channelId);
          return channel;
        });
        const missing = uniqueIds.filter((id) => !seen.has(id));
        const payload: FetchChannelsBatchOutput = {
          channels,
          missing_channel_ids: missing,
          units_consumed: res.batches * UNIT_COST.channels_list,
        };
        return { resultCount: channels.length, payload };
      },
    });

    return attachQuotaSession(result, sessionId);
  });
}
