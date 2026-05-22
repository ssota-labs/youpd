import 'server-only';

import { cache } from 'react';
import { listTrendingChartTargets, searchStoredHotVideos } from '@youpd/api/youtube';
import { formatDateLabel } from './format';
import {
  parseHotVideoSearchParams,
  parseHotVideoSort,
  parseHotVideoViewMode,
} from './parse-params';

function buildStatusLabel(input: {
  date?: string;
  dateEnd?: string;
  categoryId?: string | null;
  categoryLabels: Record<string, string>;
}): string {
  const datePart =
    input.date && input.dateEnd
      ? `${formatDateLabel(input.date)} ~ ${formatDateLabel(input.dateEnd)}`
      : input.date
        ? formatDateLabel(input.date)
        : '전체 기간';

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
      date: filters.date,
      dateEnd: filters.dateEnd,
      categoryId: filters.categoryId,
      categoryLabels,
    });

    return {
      filters,
      view,
      sort,
      order,
      categoryLabels,
      result,
      statusLabel,
      scoreIncomplete,
    };
  },
);
