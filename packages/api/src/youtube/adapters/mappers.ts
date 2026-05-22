import type { ChannelSummary, CommentSummary, VideoSummary } from '@youpd/youtube';
import type {
  ChannelCore,
  CommentCore,
  VideoCore,
} from '../core/models';

export function mapVideoSummary(video: VideoSummary): VideoCore {
  return {
    id: video.videoId,
    provider: 'youtube',
    title: video.title,
    channelId: video.channelId,
    channelTitle: video.channelTitle ?? '',
    publishedAt: video.publishedAt || null,
    durationSec: video.durationSeconds ?? null,
    metrics: {
      views: video.views ?? null,
      likes: video.likes ?? null,
      comments: video.comments ?? null,
    },
    url: video.url ?? `https://www.youtube.com/watch?v=${video.videoId}`,
    thumbnailUrl:
      video.thumbnails.default?.url ??
      video.thumbnails.medium?.url ??
      video.thumbnails.high?.url ??
      null,
  };
}

export function mapChannelSummary(channel: ChannelSummary): ChannelCore {
  return {
    id: channel.channelId,
    provider: 'youtube',
    title: channel.title,
    thumbnailUrl:
      channel.thumbnails?.default?.url ??
      channel.thumbnails?.medium?.url ??
      channel.thumbnails?.high?.url ??
      null,
    publishedAt: channel.publishedAt || null,
    subscriberCount: channel.subscriberCount ?? null,
    videoCount: channel.videoCount ?? null,
    averageViewCount: null,
    uploadsPlaylistId: channel.uploadsPlaylistId ?? null,
    url: channel.url ?? `https://www.youtube.com/channel/${channel.channelId}`,
  };
}

export function mapCommentSummary(comment: CommentSummary): CommentCore {
  return {
    id: comment.commentId,
    provider: 'youtube',
    videoId: comment.videoId,
    author: comment.authorDisplayName ?? '',
    text: comment.text ?? '',
    likeCount: comment.likeCount ?? 0,
    publishedAt: comment.publishedAt ?? null,
  };
}

export function mapDbVideoRow(
  video: {
    videoId: string;
    title: string;
    channelId: string | null;
    publishedAt: Date | null;
    durationSec: number | null;
    viewCount: number | null;
    likeCount: number | null;
    commentCount: number | null;
    videoUrl: string | null;
    thumbnailUrl: string | null;
  },
  channel?: {
    channelId: string;
    title: string;
  } | null,
): VideoCore {
  return {
    id: video.videoId,
    provider: 'youtube',
    title: video.title,
    channelId: video.channelId ?? '',
    channelTitle: channel?.title ?? '',
    publishedAt: video.publishedAt?.toISOString() ?? null,
    durationSec: video.durationSec,
    metrics: {
      views: video.viewCount,
      likes: video.likeCount,
      comments: video.commentCount,
    },
    url: video.videoUrl ?? `https://www.youtube.com/watch?v=${video.videoId}`,
    thumbnailUrl: video.thumbnailUrl,
  };
}

export function mapDbChannelRow(channel: {
  channelId: string;
  title: string;
  thumbnailUrl?: string | null;
  publishedAt: Date | null;
  subscriberCount: number | null;
  videoCount: number | null;
  averageViewCount: number | null;
  uploadsPlaylistId: string | null;
  url: string | null;
}): ChannelCore {
  return {
    id: channel.channelId,
    provider: 'youtube',
    title: channel.title,
    thumbnailUrl: channel.thumbnailUrl ?? null,
    publishedAt: channel.publishedAt?.toISOString() ?? null,
    subscriberCount: channel.subscriberCount,
    videoCount: channel.videoCount,
    averageViewCount: channel.averageViewCount,
    uploadsPlaylistId: channel.uploadsPlaylistId,
    url: channel.url ?? `https://www.youtube.com/channel/${channel.channelId}`,
  };
}

type FoundationApiVideo = {
  videoId: string;
  title: string;
  channelId: string;
  channelTitle?: string;
  publishedAt?: string;
  durationSeconds?: number | null;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  url?: string | null;
};

type FoundationChannel = ChannelSummary | {
  channelId: string;
  title: string;
  description?: string;
  publishedAt?: string;
  thumbnailUrl?: string | null;
  subscriberCount?: number | null;
  videoCount?: number | null;
  viewCount?: number | null;
  hiddenSubscriberCount?: boolean;
  averageViewCount?: number | null;
  uploadsPlaylistId?: string | null;
  country?: string | null;
  url?: string | null;
};

export function mapFoundationVideo(
  video: VideoSummary | FoundationApiVideo,
): VideoCore {
  if ('thumbnails' in video) {
    return mapVideoSummary(video);
  }
  return mapDbVideoRow(
    {
      videoId: video.videoId,
      title: video.title,
      channelId: video.channelId,
      publishedAt: video.publishedAt ? new Date(video.publishedAt) : null,
      durationSec: video.durationSeconds ?? null,
      viewCount: video.views ?? null,
      likeCount: video.likes ?? null,
      commentCount: video.comments ?? null,
      videoUrl: video.url ?? null,
      thumbnailUrl: null,
    },
    video.channelTitle
      ? { channelId: video.channelId, title: video.channelTitle }
      : null,
  );
}

export function mapFoundationChannel(channel: FoundationChannel): ChannelCore {
  if ('thumbnails' in channel) {
    return mapChannelSummary(channel);
  }
  return {
    id: channel.channelId,
    provider: 'youtube',
    title: channel.title,
    thumbnailUrl: channel.thumbnailUrl ?? null,
    publishedAt: channel.publishedAt || null,
    subscriberCount: channel.subscriberCount ?? null,
    videoCount: channel.videoCount ?? null,
    averageViewCount: channel.averageViewCount ?? null,
    uploadsPlaylistId: channel.uploadsPlaylistId ?? null,
    url: channel.url ?? `https://www.youtube.com/channel/${channel.channelId}`,
  };
}
