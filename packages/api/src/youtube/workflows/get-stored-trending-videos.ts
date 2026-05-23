import type { WorkflowWarning } from '../core/models';
import type { GetTrendingVideosInput } from './schemas';
import { createDefaultWorkflowDeps, workflowEnvelope, type WorkflowDeps } from './deps';

function toSearchInput(input: GetTrendingVideosInput) {
  return {
    regionCode: input.regionCode,
    date: input.date,
    dateEnd: input.dateEnd ?? null,
    categoryId: input.categoryId,
    q: input.q ?? null,
    limit: input.limit,
    offset: (input.page - 1) * input.limit,
    sort: input.sort,
    order: input.sort ? (input.order ?? 'desc') : undefined,
    isShort: input.isShort,
    minPerformanceGrade: input.minPerformanceGrade,
    minContributionGrade: input.minContributionGrade,
    scoreLogic: input.scoreLogic,
    minSubscribers: input.minSubscribers,
    maxSubscribers: input.maxSubscribers,
    minViews: input.minViews,
    maxViews: input.maxViews,
  };
}

export async function getStoredTrendingVideos(
  input: GetTrendingVideosInput,
  deps: WorkflowDeps = createDefaultWorkflowDeps(),
) {
  const warnings: WorkflowWarning[] = [];
  const result = await deps.trending.searchHotVideos(toSearchInput(input));

  if (result.rows.length === 0) {
    warnings.push({
      code: 'TRENDING_DATA_NOT_FOUND',
      message:
        'No stored trending videos were found for the requested filters. Daily trending collection may not have completed yet, or filters may be too strict.',
      target: {
        date: input.date,
        dateEnd: input.dateEnd ?? null,
        regionCode: input.regionCode,
        categoryId: input.categoryId ?? null,
        isShort: input.isShort,
        minPerformanceGrade: input.minPerformanceGrade,
        minContributionGrade: input.minContributionGrade,
        scoreLogic: input.scoreLogic,
      },
    });
  }

  const incompleteScoreCount = result.rows.filter(
    (row) =>
      row.video != null &&
      (row.video.score.performance.grade === 'Unknown' ||
        row.video.score.contribution.grade === 'Unknown'),
  ).length;

  if (incompleteScoreCount > 0) {
    warnings.push({
      code: 'SCORE_DATA_INCOMPLETE',
      message:
        'Some videos are missing channel subscriber or average view data required for full score calculation.',
      target: {
        count: incompleteScoreCount,
      },
    });
  }

  return workflowEnvelope(
    {
      date: input.date,
      dateEnd: input.dateEnd ?? null,
      regionCode: input.regionCode,
      categoryId: input.categoryId ?? null,
      q: input.q ?? null,
      page: input.page,
      limit: input.limit,
      sort: input.sort ?? null,
      order: input.order ?? null,
      total: result.total,
      hasMore: result.hasMore,
      filters: {
        isShort: input.isShort,
        minPerformanceGrade: input.minPerformanceGrade,
        minContributionGrade: input.minContributionGrade,
        scoreLogic: input.scoreLogic,
        minSubscribers: input.minSubscribers ?? null,
        maxSubscribers: input.maxSubscribers ?? null,
        minViews: input.minViews ?? null,
        maxViews: input.maxViews ?? null,
      },
      videos: result.rows,
    },
    warnings,
  );
}
