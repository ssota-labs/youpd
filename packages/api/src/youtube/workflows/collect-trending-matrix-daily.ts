import { listTrendingChartTargets } from '../trending/catalog';
import { fetchTrendingYouTubeVideos } from '../foundation';
import type { CollectTrendingMatrixDailyInput } from './schemas';
import { createDefaultWorkflowDeps, workflowEnvelope, type WorkflowDeps } from './deps';

export type TrendingMatrixTargetResult = {
  regionCode: string;
  categoryId: string;
  categoryTitleKo: string;
  status: 'success' | 'failed';
  collectedCount: number;
  unitsConsumed: number;
  harvestId: string | null;
  error?: string;
};

export async function collectTrendingMatrixDaily(
  input: CollectTrendingMatrixDailyInput,
  deps: WorkflowDeps = createDefaultWorkflowDeps(),
) {
  const date = input.date ?? deps.clock.todayYmd();
  const targets = listTrendingChartTargets({
    regionCodes: input.regionCodes,
    categoryIds: input.categoryIds,
  });

  const results: TrendingMatrixTargetResult[] = [];
  let totalUnitsConsumed = 0;
  let successCount = 0;
  let failedCount = 0;

  for (const target of targets) {
    try {
      const out = await fetchTrendingYouTubeVideos({
        date,
        regionCode: target.regionCode,
        categoryId: target.categoryId,
        limit: input.limit,
        persist: true,
      });

      totalUnitsConsumed += out.data.unitsConsumed ?? 0;
      successCount += 1;
      results.push({
        regionCode: target.regionCode,
        categoryId: target.categoryId,
        categoryTitleKo: target.titleKo,
        status: 'success',
        collectedCount: out.data.videos.length,
        unitsConsumed: out.data.unitsConsumed ?? 0,
        harvestId: out.harvest?.id ?? null,
      });
    } catch (error) {
      failedCount += 1;
      results.push({
        regionCode: target.regionCode,
        categoryId: target.categoryId,
        categoryTitleKo: target.titleKo,
        status: 'failed',
        collectedCount: 0,
        unitsConsumed: 0,
        harvestId: null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const warnings =
    failedCount > 0
      ? [
          {
            code: 'TRENDING_MATRIX_PARTIAL_FAILURE',
            message: `${failedCount} of ${targets.length} chart targets failed.`,
            target: { failedCount, successCount, totalTargets: targets.length },
          },
        ]
      : [];

  return workflowEnvelope(
    {
      date,
      totalTargets: targets.length,
      successCount,
      failedCount,
      totalUnitsConsumed,
      targets: results,
    },
    warnings,
  );
}
