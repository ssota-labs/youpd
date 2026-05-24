import 'server-only';

import { cache } from 'react';
import { listTrendingChartTargets, searchStoredHotVideos } from '@youpd/api/youtube';
import { buildHotVideoFilterStats } from './filter-stats';
import { formatDateLabel } from './format';
import {
  parseHotVideoSearchParams,
  parseHotVideoSort,
  parseHotVideoViewMode,
} from './parse-params';

function buildStatusLabel(input: {
  date: string;
  categoryId?: string | null;
  categoryLabels: Record<string, string>;
}): string {
  const datePart = formatDateLabel(input.date);

  const categoryPart = input.categoryId
    ? (input.categoryLabels[input.categoryId] ?? `카테고리 ${input.categoryId}`)
    : '전체 카테고리';

  return `${datePart} · ${categoryPart} · 핫비디오`;
}

export const loadHotVideoPageData = cache(
  async (sp: Record<string, string | string[] | undefined>) => {
    const filters = parseHotVideoSearchParams(sp);
    const view = parseHotVideoViewMode(sp);
    const { sort, order } = parseHotVideoSort(sp);

    const categories = listTrendingChartTargets({ regionCodes: ['KR'] });
    const categoryLabels = Object.fromEntries(
      categories.map((category) => [category.categoryId, category.titleKo]),
    );

    const result = await searchStoredHotVideos(filters);

    const scoreIncomplete = result.warnings.some(
      (warning) => warning.code === 'SCORE_DATA_INCOMPLETE',
    );

    const statusLabel = buildStatusLabel({
      date: filters.date!,
      categoryId: filters.categoryId,
      categoryLabels,
    });

    return {
      filters,
      view,
      sort,
      order,
      categoryLabels,
      filterStats: buildHotVideoFilterStats(result.data.videos),
      result,
      statusLabel,
      scoreIncomplete,
    };
  },
);
