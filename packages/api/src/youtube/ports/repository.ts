import type {
  ChannelMetricSnapshotCore,
  ChannelCore,
  ScoredVideoCore,
  VideoCore,
  VideoMetricSnapshotCore,
} from '../core/models';
import type { HotVideoSortField, HotVideoSortOrder, ScoreGradeFilter, ScoreLogic } from '../workflows/schemas';

export type QueryHotVideosRequest = {
  date: string;
  regionCode: string;
  categoryId?: string | null;
  limit: number;
};

export type HotVideoSearchFilters = {
  isShort?: boolean | null;
  minPerformanceGrade?: ScoreGradeFilter | null;
  minContributionGrade?: ScoreGradeFilter | null;
  scoreLogic?: ScoreLogic;
  minSubscribers?: number;
  maxSubscribers?: number;
  minViews?: number;
  maxViews?: number;
};

export type SearchHotVideosRequest = {
  regionCode: string;
  date?: string | null;
  dateEnd?: string | null;
  categoryId?: string | null;
  q?: string | null;
  limit: number;
  offset: number;
  sort?: HotVideoSortField;
  order?: HotVideoSortOrder;
} & HotVideoSearchFilters;

export type HotVideoRow = {
  hotDate: string;
  rank: number;
  categoryId: string | null;
  regionCode: string;
  video: ScoredVideoCore | null;
  channel: ChannelCore | null;
};

export type SearchHotVideosResponse = {
  rows: HotVideoRow[];
  total: number;
  hasMore: boolean;
};

export interface TrendingRepositoryPort {
  queryHotVideos(input: QueryHotVideosRequest): Promise<HotVideoRow[]>;
  searchHotVideos(input: SearchHotVideosRequest): Promise<SearchHotVideosResponse>;
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
