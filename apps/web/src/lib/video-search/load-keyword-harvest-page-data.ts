import 'server-only';

import { cache } from 'react';
import { searchKeywordHarvestResults } from '@youpd/api/youtube';
import { buildHotVideoFilterStats } from './filter-stats';
import { parseKeywordHarvestSearchParams } from './parse-keyword-harvest-params';
import { parseVideoSearchSort, parseVideoSearchViewMode } from './query-string';

function buildStatusLabel(input: { keyword: string; harvestId: string }): string {
  return `${input.keyword} · harvest ${input.harvestId.slice(0, 8)} · 키워드 검색 결과`;
}

export const loadKeywordHarvestPageData = cache(
  async (
    harvestId: string,
    sp: Record<string, string | string[] | undefined>,
  ) => {
    const filters = parseKeywordHarvestSearchParams(harvestId, sp);
    const view = parseVideoSearchViewMode(sp);
    const { sort, order } = parseVideoSearchSort(sp);

    const result = await searchKeywordHarvestResults(filters);

    const scoreIncomplete = result.warnings.some(
      (warning) => warning.code === 'SCORE_DATA_INCOMPLETE',
    );

    const keyword = result.data.keyword ?? 'Unknown keyword';
    const statusLabel = buildStatusLabel({ keyword, harvestId });

    return {
      filters,
      view,
      sort,
      order,
      categoryLabels: {} as Record<string, string>,
      filterStats: buildHotVideoFilterStats(result.data.videos),
      result,
      statusLabel,
      scoreIncomplete,
      keyword,
      harvestId,
    };
  },
);
