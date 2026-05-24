export type HotVideoViewMode = 'grid' | 'list';

export const HOT_VIDEO_SORT_FIELDS = [
  'views',
  'subscribers',
  'contribution',
  'performance',
  'duration',
  'videoCount',
  'publishedAt',
] as const;

export type HotVideoSortField = (typeof HOT_VIDEO_SORT_FIELDS)[number];
export type HotVideoSortOrder = 'asc' | 'desc';

/** Treat missing, empty, and "all" category selections as no category filter. */
export function normalizeHotVideoCategoryId(
  categoryId: string | undefined,
): string | undefined {
  if (categoryId === undefined || categoryId === '' || categoryId === 'all') {
    return undefined;
  }
  return categoryId;
}

function pickString(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = sp[key];
  return typeof value === 'string' ? value : undefined;
}

export function parseHotVideoViewMode(
  sp: Record<string, string | string[] | undefined>,
): HotVideoViewMode {
  return pickString(sp, 'view') === 'list' ? 'list' : 'grid';
}

export function parseHotVideoSort(
  sp: Record<string, string | string[] | undefined>,
): {
  sort?: HotVideoSortField;
  order: HotVideoSortOrder;
} {
  const sortRaw = pickString(sp, 'sort');
  const sort = HOT_VIDEO_SORT_FIELDS.includes(sortRaw as HotVideoSortField)
    ? (sortRaw as HotVideoSortField)
    : undefined;
  return {
    sort,
    order: pickString(sp, 'order') === 'asc' ? 'asc' : 'desc',
  };
}

export function buildHotVideoQueryString(
  params: Record<string, string | number | null | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export function buildHotVideoSortHref(
  sortField: HotVideoSortField,
  current: {
    sort?: HotVideoSortField;
    order: HotVideoSortOrder;
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
  },
): string {
  const nextOrder: HotVideoSortOrder =
    current.sort === sortField
      ? current.order === 'desc'
        ? 'asc'
        : 'desc'
      : 'desc';

  return `/hot-videos${buildHotVideoQueryString({
    q: current.q,
    date: current.date,
    categoryId: current.categoryId ?? undefined,
    source: current.source,
    isShort: current.isShort,
    minPerformanceGrade: current.minPerformanceGrade,
    minContributionGrade: current.minContributionGrade,
    scoreLogic: current.scoreLogic,
    minSubscribers: current.minSubscribers,
    maxSubscribers: current.maxSubscribers,
    minViews: current.minViews,
    maxViews: current.maxViews,
    publishedAfter: current.publishedAfter,
    publishedBefore: current.publishedBefore,
    performanceGrades: current.performanceGrades,
    contributionGrades: current.contributionGrades,
    view: current.view,
    sort: sortField,
    order: nextOrder,
  })}`;
}
