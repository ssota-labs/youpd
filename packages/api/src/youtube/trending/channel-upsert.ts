import type { CanonicalChannelInput } from '@youpd/supabase/repositories/youtube';
import type { ChannelSummary } from '@youpd/youtube';

export function channelUpsertFromSummary(
  channel: ChannelSummary,
): CanonicalChannelInput {
  const averageViewCount =
    channel.videoCount != null &&
    channel.videoCount > 0 &&
    channel.viewCount != null
      ? Math.round(channel.viewCount / channel.videoCount)
      : null;

  return {
    channelId: channel.channelId,
    title: channel.title,
    description: channel.description,
    publishedAt: channel.publishedAt || null,
    thumbnails: channel.thumbnails,
    subscriberCount: channel.subscriberCount,
    videoCount: channel.videoCount,
    viewCount: channel.viewCount,
    hiddenSubscriberCount: channel.hiddenSubscriberCount,
    averageViewCount,
    averageViewCountBasis:
      averageViewCount != null ? { method: 'channel_lifetime_ratio' } : null,
    uploadsPlaylistId: channel.uploadsPlaylistId,
    country: channel.country,
    url: channel.url,
  };
}
