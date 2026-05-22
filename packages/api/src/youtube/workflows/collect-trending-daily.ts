import type { WorkflowWarning } from '../core/models';
import { sortByAdjustedScore, withScore } from '../adapters/scoring';
import type { CollectTrendingDailyInput } from './schemas';
import { createDefaultWorkflowDeps, workflowEnvelope, type WorkflowDeps } from './deps';
import { ensureChannelAnalysis } from './ensure-channel-analysis';
import { ensureVideoAnalysis } from './ensure-video-analysis';

export async function collectTrendingDaily(
  input: CollectTrendingDailyInput,
  deps: WorkflowDeps = createDefaultWorkflowDeps(),
) {
  const warnings: WorkflowWarning[] = [];
  const snapshotDate = deps.clock.todayYmd();
  const trending = await deps.source.fetchTrending({
    date: snapshotDate,
    regionCode: input.regionCode,
    categoryId: input.categoryId,
    limit: input.limit,
  });

  const scored = trending.videos.map((video) =>
    withScore(video, {
      id: video.channelId,
      provider: 'youtube',
      title: video.channelTitle,
      publishedAt: null,
      subscriberCount: null,
      videoCount: null,
      averageViewCount: null,
      uploadsPlaylistId: null,
      url: `https://www.youtube.com/channel/${video.channelId}`,
    }),
  );
  const autoAnalyzeLimit = Math.min(
    input.autoAnalyzeTop,
    deps.policy.trendingAutoAnalyzeLimit(),
  );
  const topPerformers = sortByAdjustedScore(scored).slice(0, autoAnalyzeLimit);

  const analyzedVideos = [];
  const analyzedChannels = new Set<string>();

  for (const video of topPerformers) {
    try {
      analyzedVideos.push(
        (await ensureVideoAnalysis(
          {
            videoId: video.id,
            includeComments: false,
            commentsTopN: 0,
          },
          deps,
        )).data,
      );
    } catch (error) {
      warnings.push({
        code: 'TRENDING_VIDEO_ANALYSIS_FAILED',
        message: error instanceof Error ? error.message : String(error),
        target: { videoId: video.id },
      });
    }

    if (!analyzedChannels.has(video.channelId)) {
      analyzedChannels.add(video.channelId);
      try {
        await ensureChannelAnalysis(
          {
            channelId: video.channelId,
            maxVideos: 50,
            topPerformingLimit: 10,
            includeComments: false,
          },
          deps,
        );
      } catch (error) {
        warnings.push({
          code: 'TRENDING_CHANNEL_ANALYSIS_FAILED',
          message: error instanceof Error ? error.message : String(error),
          target: { channelId: video.channelId },
        });
      }
    }
  }

  return workflowEnvelope(
    {
      date: trending.date,
      regionCode: trending.regionCode,
      categoryId: trending.categoryId,
      collectedCount: trending.videos.length,
      autoAnalyzedVideos: analyzedVideos.length,
      autoAnalyzedChannels: analyzedChannels.size,
      topPerformers,
    },
    warnings,
  );
}
