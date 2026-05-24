import type { WorkflowWarning } from '../core/models';
import type { SearchStoredHotVideosInput } from './schemas';
import { createDefaultWorkflowDeps, workflowEnvelope, type WorkflowDeps } from './deps';

export async function searchStoredHotVideos(
  input: SearchStoredHotVideosInput,
  deps: WorkflowDeps = createDefaultWorkflowDeps(),
) {
  const warnings: WorkflowWarning[] = [];
  const offset = (input.page - 1) * input.limit;

  const result = await deps.trending.searchHotVideos({
    regionCode: input.regionCode,
    date: input.date ?? null,
    dateEnd: input.dateEnd ?? null,
    categoryId: input.categoryId,
    source: input.source ?? null,
    q: input.q ?? null,
    limit: input.limit,
    offset,
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
    publishedAfter: input.publishedAfter,
    publishedBefore: input.publishedBefore,
    performanceGrades: input.performanceGrades,
    contributionGrades: input.contributionGrades,
  });

  if (result.rows.length === 0) {
    warnings.push({
      code: 'TRENDING_SEARCH_NO_RESULTS',
      message:
        'No stored hot videos matched the search filters. Try adjusting the date range, category, or search query.',
      target: {
        q: input.q ?? null,
        date: input.date ?? null,
        dateEnd: input.dateEnd ?? null,
        regionCode: input.regionCode,
        categoryId: input.categoryId ?? null,
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
      q: input.q ?? null,
      date: input.date ?? null,
      dateEnd: input.dateEnd ?? null,
      regionCode: input.regionCode,
      categoryId: input.categoryId ?? null,
      page: input.page,
      limit: input.limit,
      sort: input.sort ?? null,
      order: input.order,
      total: result.total,
      hasMore: result.hasMore,
      videos: result.rows,
    },
    warnings,
  );
}
