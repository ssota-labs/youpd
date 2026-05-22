import type { WorkflowWarning } from '../core/models';
import { withScore } from '../adapters/scoring';
import type { SearchKeywordWorkflowInput } from './schemas';
import { createDefaultWorkflowDeps, workflowEnvelope, type WorkflowDeps } from './deps';
import { ensureVideoAnalysis } from './ensure-video-analysis';

export async function runKeywordSearchAnalysis(
  input: SearchKeywordWorkflowInput,
  deps: WorkflowDeps = createDefaultWorkflowDeps(),
) {
  const warnings: WorkflowWarning[] = [];
  const limit = Math.min(input.limit, deps.policy.keywordAnalysisLimit());
  const search = await deps.source.searchVideos({
    keyword: input.keyword,
    regionCode: input.regionCode,
    limit,
    order: input.order,
  });

  const channelsById = new Map(search.channels.map((channel) => [channel.id, channel]));
  const analyzedVideos = [];

  for (const video of search.videos) {
    try {
      const analysis = await ensureVideoAnalysis(
        {
          videoId: video.id,
          includeComments: false,
          commentsTopN: 0,
        },
        deps,
      );
      analyzedVideos.push(analysis.data.video);
    } catch (error) {
      warnings.push({
        code: 'KEYWORD_VIDEO_ANALYSIS_FAILED',
        message: error instanceof Error ? error.message : String(error),
        target: { videoId: video.id, keyword: input.keyword },
      });
      analyzedVideos.push(
        withScore(video, channelsById.get(video.channelId) ?? null),
      );
    }
  }

  return workflowEnvelope(
    {
      keyword: search.keyword,
      regionCode: input.regionCode,
      videos: analyzedVideos,
      channels: search.channels,
      analyzedCount: analyzedVideos.length,
    },
    warnings,
  );
}
