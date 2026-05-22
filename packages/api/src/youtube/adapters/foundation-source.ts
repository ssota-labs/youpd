import {
  captureYouTubeMetricSnapshots,
  fetchTrendingYouTubeVideos,
  getYouTubeChannel,
  getYouTubeVideo,
  listYouTubeChannelVideos,
  queryYouTubeHotVideos,
  searchYouTubeVideos,
} from '../foundation';
import type { VideoSourcePort } from '../ports/source';
import {
  mapCommentSummary,
  mapDbChannelRow,
  mapDbVideoRow,
  mapFoundationChannel,
  mapFoundationVideo,
} from './mappers';

export function createFoundationVideoSourcePort(): VideoSourcePort {
  return {
    async searchVideos(input) {
      const result = await searchYouTubeVideos({
        keyword: input.keyword,
        regionCode: input.regionCode,
        limit: input.limit,
        order: input.order,
        persist: true,
        includeScore: false,
        forceRefresh: false,
        cacheTtlDays: 7,
      });
      return {
        keyword: result.data.keyword,
        videos: result.data.videos.map((video) => mapFoundationVideo(video)),
        channels: result.data.channels.map((channel) =>
          mapFoundationChannel(channel),
        ),
      };
    },

    async fetchVideoDetail(input) {
      const result = await getYouTubeVideo({
        videoId: input.videoId,
        persist: true,
        includeChannel: input.includeChannel,
        includeComments: input.includeComments,
        commentsTopN: input.commentsTopN,
        includeScore: false,
      });
      return {
        video: result.data.video ? mapFoundationVideo(result.data.video) : null,
        channel: result.data.channel
          ? mapFoundationChannel(result.data.channel)
          : null,
        comments: result.data.comments.map(mapCommentSummary),
        commentsDisabled: result.data.commentsDisabled,
      };
    },

    async fetchChannelDetail(input) {
      const result = await getYouTubeChannel({
        channelId: input.channelId,
        persist: true,
        refreshAverage: true,
        averageVideoLimit: input.averageVideoLimit,
      });
      return {
        channel: result.data.channel
          ? mapFoundationChannel(result.data.channel)
          : null,
        topVideos: result.data.topVideos.map((video) => mapFoundationVideo(video)),
      };
    },

    async fetchChannelVideos(input) {
      const result = await listYouTubeChannelVideos({
        channelId: input.channelId,
        limit: input.limit,
        persist: true,
        updateChannelAverage: true,
      });
      return {
        channel: result.data.channel
          ? mapFoundationChannel(result.data.channel)
          : null,
        videos: result.data.videos.map((video) => mapFoundationVideo(video)),
      };
    },

    async fetchTrending(input) {
      const result = await fetchTrendingYouTubeVideos({
        date: input.date,
        regionCode: input.regionCode,
        categoryId: input.categoryId ?? null,
        limit: input.limit,
        persist: true,
      });
      return {
        date: result.data.date,
        regionCode: result.data.regionCode,
        categoryId: result.data.categoryId,
        videos: result.data.videos.map((video) => mapFoundationVideo(video)),
      };
    },
  };
}

export function createFoundationTrendingRepositoryPort() {
  return {
    async queryHotVideos(input: {
      date: string;
      regionCode: string;
      categoryId?: string | null;
      limit: number;
    }) {
      const { withScore } = await import('./scoring');
      const result = await queryYouTubeHotVideos({
        date: input.date,
        regionCode: input.regionCode,
        categoryId: input.categoryId,
        limit: input.limit,
      });
      return result.data.videos.map((row) => ({
        hotDate: row.hotVideo.hotDate,
        rank: row.hotVideo.rank,
        video:
          row.video != null
            ? withScore(
                mapDbVideoRow(row.video, row.channel),
                row.channel ? mapDbChannelRow(row.channel) : null,
              )
            : null,
        channel: row.channel ? mapDbChannelRow(row.channel) : null,
      }));
    },
  };
}

export function createFoundationSnapshotRepositoryPort() {
  return {
    async captureVideoAndChannelSnapshots(input: {
      snapshotDate: string;
      videoIds: string[];
      channelIds: string[];
      source: string;
    }) {
      const result = await captureYouTubeMetricSnapshots({
        snapshotDate: input.snapshotDate,
        videoIds: input.videoIds,
        channelIds: input.channelIds,
        source: input.source,
        persist: true,
      });
      return {
        videoSnapshots: result.data.videoSnapshots.map((snapshot) => ({
          snapshotDate: input.snapshotDate,
          videoId: snapshot.video_id,
          viewCount: snapshot.views ?? null,
          likeCount: snapshot.likes ?? null,
          commentCount: snapshot.comments ?? null,
          source: input.source,
        })),
        channelSnapshots: result.data.channelSnapshots.map((snapshot) => ({
          snapshotDate: input.snapshotDate,
          channelId: snapshot.channel_id,
          subscriberCount: snapshot.subscribers ?? null,
          viewCount: snapshot.view_count ?? null,
          videoCount: snapshot.video_count ?? null,
          source: input.source,
        })),
        missingVideoIds: result.data.missingVideoIds,
        missingChannelIds: result.data.missingChannelIds,
      };
    },

    async listAllVideoIds(limit = 5000) {
      const { listAllYouTubeVideoIds } = await import(
        '@youpd/supabase/repositories/youtube'
      );
      return listAllYouTubeVideoIds(limit);
    },

    async listAllChannelIds(limit = 2000) {
      const { listAllYouTubeChannelIds } = await import(
        '@youpd/supabase/repositories/youtube'
      );
      return listAllYouTubeChannelIds(limit);
    },
  };
}
