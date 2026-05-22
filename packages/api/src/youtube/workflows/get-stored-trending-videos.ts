import type { WorkflowWarning } from '../core/models';
import type { GetTrendingVideosInput } from './schemas';
import { createDefaultWorkflowDeps, workflowEnvelope, type WorkflowDeps } from './deps';

export async function getStoredTrendingVideos(
  input: GetTrendingVideosInput,
  deps: WorkflowDeps = createDefaultWorkflowDeps(),
) {
  const warnings: WorkflowWarning[] = [];
  const rows = await deps.trending.queryHotVideos({
    date: input.date,
    regionCode: input.regionCode,
    categoryId: input.categoryId,
    limit: input.limit,
  });

  if (rows.length === 0) {
    warnings.push({
      code: 'TRENDING_DATA_NOT_FOUND',
      message:
        'No stored trending videos were found for the requested date. Daily trending collection may not have completed yet.',
      target: {
        date: input.date,
        regionCode: input.regionCode,
        categoryId: input.categoryId ?? null,
      },
    });
  }

  return workflowEnvelope(
    {
      date: input.date,
      regionCode: input.regionCode,
      categoryId: input.categoryId ?? null,
      videos: rows,
    },
    warnings,
  );
}
