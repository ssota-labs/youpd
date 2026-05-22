import type {
  ChannelCore,
  CommentCore,
  VideoCore,
} from '../core/models';

export type SearchVideosRequest = {
  keyword: string;
  regionCode: string;
  limit: number;
  order: 'date' | 'rating' | 'relevance' | 'title' | 'videoCount' | 'viewCount';
};

export type SearchVideosResult = {
  keyword: string;
  videos: VideoCore[];
  channels: ChannelCore[];
};

export type FetchVideoDetailRequest = {
  videoId: string;
  includeChannel: boolean;
  includeComments: boolean;
  commentsTopN: number;
};

export type FetchVideoDetailResult = {
  video: VideoCore | null;
  channel: ChannelCore | null;
  comments: CommentCore[];
  commentsDisabled: boolean;
};

export type FetchChannelDetailRequest = {
  channelId: string;
  averageVideoLimit: number;
};

export type FetchChannelDetailResult = {
  channel: ChannelCore | null;
  topVideos: VideoCore[];
};

export type FetchChannelVideosRequest = {
  channelId: string;
  limit: number;
};

export type FetchChannelVideosResult = {
  channel: ChannelCore | null;
  videos: VideoCore[];
};

export type FetchTrendingRequest = {
  date?: string;
  regionCode: string;
  categoryId?: string | null;
  limit: number;
};

export type FetchTrendingResult = {
  date: string;
  regionCode: string;
  categoryId: string | null;
  videos: VideoCore[];
};

export interface VideoSourcePort {
  searchVideos(input: SearchVideosRequest): Promise<SearchVideosResult>;
  fetchVideoDetail(input: FetchVideoDetailRequest): Promise<FetchVideoDetailResult>;
  fetchChannelDetail(input: FetchChannelDetailRequest): Promise<FetchChannelDetailResult>;
  fetchChannelVideos(input: FetchChannelVideosRequest): Promise<FetchChannelVideosResult>;
  fetchTrending(input: FetchTrendingRequest): Promise<FetchTrendingResult>;
}
