import type { ReadonlyURLSearchParams } from 'next/navigation';
import type { VideoSearchFieldConfig } from './config';
import {
  normalizeHotVideoCategoryId,
  parseVideoSearchSort,
  parseVideoSearchViewMode,
  type VideoSearchSortField,
  type VideoSearchSortOrder,
  type VideoSearchViewMode,
} from './query-string';
import { resolveHotVideoDate } from './today-korea';

function pickParam(
  searchParams: ReadonlyURLSearchParams,
  key: string,
): string | undefined {
  const value = searchParams.get(key);
  return value ?? undefined;
}

export function readVideoSearchUrlState(
  searchParams: ReadonlyURLSearchParams,
  fields: VideoSearchFieldConfig = {
    q: true,
    date: true,
    categoryId: true,
    source: true,
  },
): {
  q?: string;
  date?: string;
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
  view: VideoSearchViewMode;
  sort?: VideoSearchSortField;
  order: VideoSearchSortOrder;
  regionCode?: string;
} {
  const sp = Object.fromEntries(searchParams.entries());
  const { sort, order } = parseVideoSearchSort(sp);
  const categoryIdRaw = fields.categoryId
    ? pickParam(searchParams, 'categoryId')
    : undefined;

  return {
    q: fields.q ? pickParam(searchParams, 'q') : undefined,
    date: fields.date
      ? resolveHotVideoDate(pickParam(searchParams, 'date'))
      : undefined,
    categoryId: fields.categoryId
      ? normalizeHotVideoCategoryId(categoryIdRaw)
      : undefined,
    source: fields.source ? pickParam(searchParams, 'source') : undefined,
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
    view: parseVideoSearchViewMode(sp),
    sort,
    order,
    regionCode: pickParam(searchParams, 'regionCode'),
  };
}

export const readHotVideoUrlState = (
  searchParams: ReadonlyURLSearchParams,
) =>
  readVideoSearchUrlState(searchParams, {
    q: true,
    date: true,
    categoryId: true,
    source: true,
  });
