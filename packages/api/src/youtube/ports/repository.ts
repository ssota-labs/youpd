import type {
  ChannelMetricSnapshotCore,
  ChannelCore,
  ScoredVideoCore,
  VideoCore,
  VideoMetricSnapshotCore,
} from '../core/models';

export type QueryHotVideosRequest = {
  date: string;
  regionCode: string;
  categoryId?: string | null;
  limit: number;
};

export type HotVideoRow = {
  hotDate: string;
  rank: number;
  video: ScoredVideoCore | null;
  channel: ChannelCore | null;
};

export interface TrendingRepositoryPort {
  queryHotVideos(input: QueryHotVideosRequest): Promise<HotVideoRow[]>;
}

export interface SnapshotRepositoryPort {
  captureVideoAndChannelSnapshots(input: {
    snapshotDate: string;
    videoIds: string[];
    channelIds: string[];
    source: string;
  }): Promise<{
    videoSnapshots: VideoMetricSnapshotCore[];
    channelSnapshots: ChannelMetricSnapshotCore[];
    missingVideoIds: string[];
    missingChannelIds: string[];
  }>;
  listAllVideoIds(limit?: number): Promise<string[]>;
  listAllChannelIds(limit?: number): Promise<string[]>;
}

export interface ScoringPort {
  scoreVideo(
    video: VideoCore,
    channel: ChannelCore | null,
  ): ScoredVideoCore['score'] & { video: VideoCore };
}
