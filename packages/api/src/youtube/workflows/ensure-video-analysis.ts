import type { WorkflowWarning } from '../core/models';
import { withScore } from '../adapters/scoring';
import type { AnalyzeVideoInput } from './schemas';
import { createDefaultWorkflowDeps, workflowEnvelope, type WorkflowDeps } from './deps';

export async function ensureVideoAnalysis(
  input: AnalyzeVideoInput,
  deps: WorkflowDeps = createDefaultWorkflowDeps(),
) {
  const warnings: WorkflowWarning[] = [];
  const detail = await deps.source.fetchVideoDetail({
    videoId: input.videoId,
    includeChannel: true,
    includeComments: input.includeComments,
    commentsTopN: input.commentsTopN,
  });

  if (!detail.video) {
    throw new Error(`Video not found: ${input.videoId}`);
  }

  if (detail.commentsDisabled && input.includeComments) {
    warnings.push({
      code: 'COMMENTS_DISABLED',
      message: 'Comments are disabled or unavailable for this video.',
      target: { videoId: input.videoId },
    });
  }

  const snapshotDate = deps.clock.todayYmd();
  const channelIds = detail.channel ? [detail.channel.id] : [];
  const snapshots = await deps.snapshots.captureVideoAndChannelSnapshots({
    snapshotDate,
    videoIds: [input.videoId],
    channelIds,
    source: deps.policy.snapshotSource(),
  });

  const scoredVideo = withScore(detail.video, detail.channel);

  return workflowEnvelope(
    {
      video: scoredVideo,
      channel: detail.channel,
      comments: detail.comments,
      snapshots,
      snapshotDate,
    },
    warnings,
  );
}
