import { searchYouTubeVideos } from '../foundation';
import type { RunKeywordSearchBatchInput } from './schemas';
import { createDefaultWorkflowDeps, workflowEnvelope, type WorkflowDeps } from './deps';

export type KeywordSearchBatchItemResult = {
  keyword: string;
  status: 'success' | 'failed';
  videoCount: number;
  unitsConsumed: number;
  harvestId: string | null;
  error?: string;
};

export async function runKeywordSearchBatch(
  input: RunKeywordSearchBatchInput,
  _deps: WorkflowDeps = createDefaultWorkflowDeps(),
) {
  const results: KeywordSearchBatchItemResult[] = [];
  let totalUnitsConsumed = 0;
  let successCount = 0;
  let failedCount = 0;

  for (const keyword of input.keywords) {
    try {
      const out = await searchYouTubeVideos({
        keyword,
        regionCode: input.regionCode,
        limit: input.limit,
        order: input.order,
        persist: true,
        includeScore: true,
        forceRefresh: input.forceRefresh,
        cacheTtlDays: 7,
      });
      totalUnitsConsumed += out.data.unitsConsumed ?? 0;
      successCount += 1;
      results.push({
        keyword,
        status: 'success',
        videoCount: out.data.videos.length,
        unitsConsumed: out.data.unitsConsumed ?? 0,
        harvestId: out.harvest?.id ?? null,
      });
    } catch (error) {
      failedCount += 1;
      results.push({
        keyword,
        status: 'failed',
        videoCount: 0,
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
            code: 'KEYWORD_SEARCH_BATCH_PARTIAL_FAILURE',
            message: `${failedCount} of ${input.keywords.length} keyword searches failed.`,
            target: { failedCount, successCount, totalKeywords: input.keywords.length },
          },
        ]
      : [];

  return workflowEnvelope(
    {
      regionCode: input.regionCode,
      order: input.order,
      limit: input.limit,
      forceRefresh: input.forceRefresh,
      totalKeywords: input.keywords.length,
      successCount,
      failedCount,
      totalUnitsConsumed,
      results,
    },
    warnings,
  );
}
