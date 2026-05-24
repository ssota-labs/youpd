import type { ReadonlyURLSearchParams } from 'next/navigation';
import {
  normalizeHotVideoCategoryId,
  parseHotVideoSort,
  parseHotVideoViewMode,
  type HotVideoSortField,
  type HotVideoSortOrder,
  type HotVideoViewMode,
} from './query-string';
import { resolveHotVideoDate } from './today-korea';

function pickParam(
  searchParams: ReadonlyURLSearchParams,
  key: string,
): string | undefined {
  const value = searchParams.get(key);
  return value ?? undefined;
}

export function readHotVideoUrlState(searchParams: ReadonlyURLSearchParams): {
  q?: string;
  date: string;
  categoryId?: string | null;
  source?: string;
  isShort?: string;
  minPerformanceGrade?: string;
  minContributionGrade?: string;
  scoreLogic?: string;
  minSubscribers?: string;
  maxSubscribers?: string;
  minViews?: string;
  maxViews?: string;
  publishedAfter?: string;
  publishedBefore?: string;
  performanceGrades?: string;
  contributionGrades?: string;
  view: HotVideoViewMode;
  sort?: HotVideoSortField;
  order: HotVideoSortOrder;
} {
  const sp = Object.fromEntries(searchParams.entries());
  const { sort, order } = parseHotVideoSort(sp);
  const categoryIdRaw = pickParam(searchParams, 'categoryId');

  return {
    q: pickParam(searchParams, 'q'),
    date: resolveHotVideoDate(pickParam(searchParams, 'date')),
    categoryId: normalizeHotVideoCategoryId(categoryIdRaw),
    source: pickParam(searchParams, 'source'),
    isShort: pickParam(searchParams, 'isShort'),
    minPerformanceGrade: pickParam(searchParams, 'minPerformanceGrade'),
    minContributionGrade: pickParam(searchParams, 'minContributionGrade'),
    scoreLogic: pickParam(searchParams, 'scoreLogic'),
    minSubscribers: pickParam(searchParams, 'minSubscribers'),
    maxSubscribers: pickParam(searchParams, 'maxSubscribers'),
    minViews: pickParam(searchParams, 'minViews'),
    maxViews: pickParam(searchParams, 'maxViews'),
    publishedAfter: pickParam(searchParams, 'publishedAfter'),
    publishedBefore: pickParam(searchParams, 'publishedBefore'),
    performanceGrades: pickParam(searchParams, 'performanceGrades'),
    contributionGrades: pickParam(searchParams, 'contributionGrades'),
    view: parseHotVideoViewMode(sp),
    sort,
    order,
  };
}
