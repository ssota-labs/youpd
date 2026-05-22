import type { ScoreBundle } from '../../query/scoring';

export type VideoCore = {
  id: string;
  provider: 'youtube';
  title: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string | null;
  durationSec: number | null;
  metrics: {
    views: number | null;
    likes: number | null;
    comments: number | null;
  };
  url: string;
  thumbnailUrl: string | null;
};

export type ChannelCore = {
  id: string;
  provider: 'youtube';
  title: string;
  publishedAt: string | null;
  subscriberCount: number | null;
  videoCount: number | null;
  averageViewCount: number | null;
  uploadsPlaylistId: string | null;
  url: string;
};

export type CommentCore = {
  id: string;
  provider: 'youtube';
  videoId: string;
  author: string;
  text: string;
  likeCount: number;
  publishedAt: string | null;
};

export type VideoMetricSnapshotCore = {
  snapshotDate: string;
  videoId: string;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  source: string;
};

export type ChannelMetricSnapshotCore = {
  snapshotDate: string;
  channelId: string;
  subscriberCount: number | null;
  viewCount: number | null;
  videoCount: number | null;
  source: string;
};

export type VideoScoreCore = ScoreBundle & {
  adjustedScore: number | null;
};

export type ScoredVideoCore = VideoCore & {
  score: VideoScoreCore;
};

export type WorkflowWarning = {
  code: string;
  message: string;
  target?: Record<string, unknown>;
};

export type WorkflowEnvelope<T> = {
  data: T;
  warnings: WorkflowWarning[];
  collectedAt: string;
};
