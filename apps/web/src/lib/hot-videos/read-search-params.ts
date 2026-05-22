import type { ReadonlyURLSearchParams } from 'next/navigation';
import {
  parseHotVideoSort,
  parseHotVideoViewMode,
  type HotVideoSortField,
  type HotVideoSortOrder,
  type HotVideoViewMode,
} from './query-string';

function pickParam(
  searchParams: ReadonlyURLSearchParams,
  key: string,
): string | undefined {
  const value = searchParams.get(key);
  return value ?? undefined;
}

export function readHotVideoUrlState(searchParams: ReadonlyURLSearchParams): {
  q?: string;
  date?: string;
  dateEnd?: string;
  categoryId?: string | null;
  view: HotVideoViewMode;
  sort?: HotVideoSortField;
  order: HotVideoSortOrder;
} {
  const sp = Object.fromEntries(searchParams.entries());
  const { sort, order } = parseHotVideoSort(sp);
  const categoryIdRaw = pickParam(searchParams, 'categoryId');

  return {
    q: pickParam(searchParams, 'q'),
    date: pickParam(searchParams, 'date'),
    dateEnd: pickParam(searchParams, 'dateEnd'),
    categoryId:
      categoryIdRaw === undefined || categoryIdRaw === 'all'
        ? undefined
        : categoryIdRaw,
    view: parseHotVideoViewMode(sp),
    sort,
    order,
  };
}
