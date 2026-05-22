import 'server-only';
import { SearchStoredHotVideosInputSchema } from '@youpd/api/youtube';
import { parseHotVideoSort } from './query-string';

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

export function parseHotVideoSearchParams(
  sp: Record<string, string | string[] | undefined>,
) {
  const categoryIdRaw = pickString(sp, 'categoryId');
  const pageRaw = pickString(sp, 'page');
  const limitRaw = pickString(sp, 'limit');
  const { sort, order } = parseHotVideoSort(sp);

  return SearchStoredHotVideosInputSchema.parse({
    q: pickString(sp, 'q') || undefined,
    date: pickString(sp, 'date') || undefined,
    dateEnd: pickString(sp, 'dateEnd') || undefined,
    regionCode: pickString(sp, 'regionCode') || 'KR',
    categoryId:
      categoryIdRaw === undefined
        ? undefined
        : categoryIdRaw === 'all'
          ? undefined
          : categoryIdRaw,
    page: pageRaw ? Number(pageRaw) : 1,
    limit: limitRaw ? Number(limitRaw) : 24,
    sort,
    order: sort ? order : undefined,
  });
}
