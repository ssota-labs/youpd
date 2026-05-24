import 'server-only';
import { SearchStoredHotVideosInputSchema } from '@youpd/api/youtube';
import { parseHotVideoSort } from './query-string';
import { resolveHotVideoDate } from './today-korea';

export type { HotVideoViewMode, HotVideoSortField, HotVideoSortOrder } from './query-string';
export {
  buildHotVideoQueryString,
  buildHotVideoSortHref,
  parseHotVideoViewMode,
  parseHotVideoSort,
} from './query-string';

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

export function parseHotVideoSearchParams(
  sp: Record<string, string | string[] | undefined>,
) {
  const categoryIdRaw = pickString(sp, 'categoryId');
  const pageRaw = pickString(sp, 'page');
  const limitRaw = pickString(sp, 'limit');
  const sourceRaw = pickString(sp, 'source');
  const isShortRaw = pickString(sp, 'isShort');
  const { sort, order } = parseHotVideoSort(sp);

  return SearchStoredHotVideosInputSchema.parse({
    q: pickString(sp, 'q') || undefined,
    date: resolveHotVideoDate(pickString(sp, 'date')),
    regionCode: pickString(sp, 'regionCode') || 'KR',
    categoryId:
      categoryIdRaw === undefined
        ? undefined
        : categoryIdRaw === 'all'
          ? undefined
          : categoryIdRaw,
    source:
      sourceRaw === undefined || sourceRaw === 'all'
        ? undefined
        : sourceRaw.includes(',')
          ? sourceRaw.split(',').map((value) => value.trim()).filter(Boolean)
          : sourceRaw,
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
  });
}
