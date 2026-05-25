import 'server-only';

import { SearchKeywordHarvestResultsInputSchema } from '@youpd/api/youtube';
import { parseVideoSearchSort } from './query-string';
import { parseVideoSearchViewMode } from './query-string';

function pickString(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = sp[key];
  return typeof value === 'string' ? value : undefined;
}

function pickOptionalInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function pickOptionalBoolean(
  value: string | undefined,
): boolean | null | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function pickOptionalGrade(
  value: string | undefined,
): 'Normal' | 'Good' | 'Great' | undefined {
  if (!value || value === 'none') return undefined;
  if (value === 'Normal' || value === 'Good' || value === 'Great') return value;
  return undefined;
}

function pickOptionalDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function pickOptionalGradeList(
  value: string | undefined,
): ('Normal' | 'Good' | 'Great' | 'Worst' | 'Bad')[] | undefined {
  if (!value) return undefined;

  const allowed = new Set(['Worst', 'Bad', 'Normal', 'Good', 'Great']);
  const grades = value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry): entry is 'Normal' | 'Good' | 'Great' | 'Worst' | 'Bad' =>
      allowed.has(entry),
    );

  return grades.length > 0 ? grades : undefined;
}

export function parseKeywordHarvestSearchParams(
  harvestId: string,
  sp: Record<string, string | string[] | undefined>,
) {
  const pageRaw = pickString(sp, 'page');
  const limitRaw = pickString(sp, 'limit');
  const isShortRaw = pickString(sp, 'isShort');
  const { sort, order } = parseVideoSearchSort(sp);

  return SearchKeywordHarvestResultsInputSchema.parse({
    harvestId,
    q: pickString(sp, 'q') || undefined,
    regionCode: pickString(sp, 'regionCode') || 'KR',
    page: pageRaw ? Number(pageRaw) : 1,
    limit: limitRaw ? Number(limitRaw) : 24,
    sort,
    order: sort ? order : undefined,
    isShort:
      isShortRaw === 'all' || isShortRaw === undefined
        ? undefined
        : pickOptionalBoolean(isShortRaw),
    minPerformanceGrade: pickOptionalGrade(pickString(sp, 'minPerformanceGrade')),
    minContributionGrade: pickOptionalGrade(pickString(sp, 'minContributionGrade')),
    scoreLogic: pickString(sp, 'scoreLogic') === 'and' ? 'and' : undefined,
    minSubscribers: pickOptionalInt(pickString(sp, 'minSubscribers')),
    maxSubscribers: pickOptionalInt(pickString(sp, 'maxSubscribers')),
    minViews: pickOptionalInt(pickString(sp, 'minViews')),
    maxViews: pickOptionalInt(pickString(sp, 'maxViews')),
    publishedAfter: pickOptionalDate(pickString(sp, 'publishedAfter')),
    publishedBefore: pickOptionalDate(pickString(sp, 'publishedBefore')),
    performanceGrades: pickOptionalGradeList(pickString(sp, 'performanceGrades')),
    contributionGrades: pickOptionalGradeList(pickString(sp, 'contributionGrades')),
  });
}

export { parseVideoSearchViewMode as parseKeywordHarvestViewMode };
