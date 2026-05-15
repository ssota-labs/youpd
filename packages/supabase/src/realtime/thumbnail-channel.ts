import 'server-only';
import { createServerSupabaseClient } from '../server';

export type ThumbnailChangePayload = {
  thumbnailId: string;
  version: number;
  updatedLayerId?: string | null;
  source: 'agent' | 'iframe';
};

// Broadcast a thumbnail change to all iframe subscribers of the
// `thumbnail:{id}` channel. Subscribers receive `{ event: 'patched', payload }`.
// Realtime DB events also flow through `supabase_realtime` publication, but
// broadcast is lower-latency for in-flight edits.
export async function broadcastThumbnailPatched(
  payload: ThumbnailChangePayload,
): Promise<void> {
  const client = createServerSupabaseClient();
  const channel = client.channel(`thumbnail:${payload.thumbnailId}`, {
    config: { broadcast: { ack: false, self: false } },
  });
  await channel.send({
    type: 'broadcast',
    event: 'patched',
    payload,
  });
  await client.removeChannel(channel);
}
