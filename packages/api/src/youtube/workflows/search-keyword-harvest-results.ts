import type { WorkflowWarning } from '../core/models';
import { mapDbChannelRow, mapDbVideoRow } from '../adapters/mappers';
import { withScore } from '../adapters/scoring';
import type { SearchKeywordHarvestResultsInput } from './schemas';
import { createDefaultWorkflowDeps, workflowEnvelope, type WorkflowDeps } from './deps';

export async function searchKeywordHarvestResults(
  input: SearchKeywordHarvestResultsInput,
  deps: WorkflowDeps = createDefaultWorkflowDeps(),
) {
  const {
    searchKeywordHarvestResults: searchRepo,
    getKeywordHarvestSession,
  } = await import('@youpd/supabase/repositories/youtube');

  const warnings: WorkflowWarning[] = [];
  const offset = (input.page - 1) * input.limit;

  const session = await getKeywordHarvestSession(input.harvestId);
  if (!session) {
    warnings.push({
      code: 'KEYWORD_HARVEST_NOT_FOUND',
      message: `Keyword harvest session not found: ${input.harvestId}`,
      target: { harvestId: input.harvestId },
    });
    return workflowEnvelope(
      {
        harvestId: input.harvestId,
        keyword: null,
        regionCode: input.regionCode,
        page: input.page,
        limit: input.limit,
        sort: input.sort ?? null,
        order: input.order,
        total: 0,
        hasMore: false,
        videos: [],
      },
      warnings,
    );
  }

  const result = await searchRepo({
    harvestId: input.harvestId,
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
      code: 'KEYWORD_HARVEST_SEARCH_NO_RESULTS',
      message:
        'No keyword harvest results matched the search filters. Try adjusting filters or search query.',
      target: {
        harvestId: input.harvestId,
        q: input.q ?? null,
      },
    });
  }

  const videos = result.rows.map((row) => {
    const channel = row.channel ? mapDbChannelRow(row.channel) : null;
    const collectedDate = row.result.collectedAt
      ? row.result.collectedAt.toISOString().slice(0, 10)
      : deps.clock.todayYmd();

    return {
      hotDate: collectedDate,
      rank: row.result.rank,
      categoryId: row.video.categoryId ?? null,
      regionCode: row.result.regionCode ?? input.regionCode,
      source: 'keyword_harvest',
      video:
        row.video != null
          ? withScore(mapDbVideoRow(row.video, row.channel), channel)
          : null,
      channel,
    };
  });

  const incompleteScoreCount = videos.filter(
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
      harvestId: input.harvestId,
      keyword: session.keyword,
      regionCode: input.regionCode,
      page: input.page,
      limit: input.limit,
      sort: input.sort ?? null,
      order: input.order,
      total: result.total,
      hasMore: result.hasMore,
      videos,
    },
    warnings,
  );
}
