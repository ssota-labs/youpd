import type { WorkflowWarning } from '../core/models';
import { sortByAdjustedScore, withScore } from '../adapters/scoring';
import type { AnalyzeChannelInput } from './schemas';
import { createDefaultWorkflowDeps, workflowEnvelope, type WorkflowDeps } from './deps';
import { ensureVideoAnalysis } from './ensure-video-analysis';

export async function ensureChannelAnalysis(
  input: AnalyzeChannelInput,
  deps: WorkflowDeps = createDefaultWorkflowDeps(),
) {
  const warnings: WorkflowWarning[] = [];
  const maxVideos = Math.min(input.maxVideos, deps.policy.maxChannelVideos());

  const overview = await deps.source.fetchChannelDetail({
    channelId: input.channelId,
    averageVideoLimit: Math.min(50, maxVideos),
  });

  if (!overview.channel) {
    throw new Error(`Channel not found: ${input.channelId}`);
  }

  const catalog = await deps.source.fetchChannelVideos({
    channelId: input.channelId,
    limit: maxVideos,
  });

  const channel = catalog.channel ?? overview.channel;
  const scoredVideos = catalog.videos.map((video) => withScore(video, channel));
  const topPerforming = sortByAdjustedScore(scoredVideos).slice(
    0,
    Math.min(input.topPerformingLimit, deps.policy.topPerformingVideoLimit()),
  );

  const snapshotDate = deps.clock.todayYmd();
  const snapshots = await deps.snapshots.captureVideoAndChannelSnapshots({
    snapshotDate,
    videoIds: catalog.videos.map((video) => video.id),
    channelIds: [input.channelId],
    source: deps.policy.snapshotSource(),
  });

  if (input.includeComments) {
    for (const video of topPerforming.slice(0, 5)) {
      try {
        await ensureVideoAnalysis(
          {
            videoId: video.id,
            includeComments: true,
            commentsTopN: deps.policy.defaultCommentsTopN(),
          },
          deps,
        );
      } catch (error) {
        warnings.push({
          code: 'VIDEO_COMMENT_ANALYSIS_FAILED',
          message: error instanceof Error ? error.message : String(error),
          target: { videoId: video.id, channelId: input.channelId },
        });
      }
    }
  }

  return workflowEnvelope(
    {
      channel,
      overviewTopVideos: overview.topVideos.map((video) => withScore(video, channel)),
      videos: scoredVideos,
      topPerformingVideos: topPerforming,
      snapshots,
      snapshotDate,
      videoCount: catalog.videos.length,
    },
    warnings,
  );
}
