export type VideoSearchViewMode = 'grid' | 'list';

export const VIDEO_SEARCH_SORT_FIELDS = [
  'views',
  'subscribers',
  'contribution',
  'performance',
  'duration',
  'videoCount',
  'publishedAt',
] as const;

export type VideoSearchSortField = (typeof VIDEO_SEARCH_SORT_FIELDS)[number];
export type VideoSearchSortOrder = 'asc' | 'desc';

export type HotVideoViewMode = VideoSearchViewMode;
export type HotVideoSortField = VideoSearchSortField;
export type HotVideoSortOrder = VideoSearchSortOrder;
export const HOT_VIDEO_SORT_FIELDS = VIDEO_SEARCH_SORT_FIELDS;

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

export function parseVideoSearchViewMode(
  sp: Record<string, string | string[] | undefined>,
): VideoSearchViewMode {
  return pickString(sp, 'view') === 'list' ? 'list' : 'grid';
}

export const parseHotVideoViewMode = parseVideoSearchViewMode;

export function parseVideoSearchSort(
  sp: Record<string, string | string[] | undefined>,
): {
  sort?: VideoSearchSortField;
  order: VideoSearchSortOrder;
} {
  const sortRaw = pickString(sp, 'sort');
  const sort = VIDEO_SEARCH_SORT_FIELDS.includes(sortRaw as VideoSearchSortField)
    ? (sortRaw as VideoSearchSortField)
    : undefined;
  return {
    sort,
    order: pickString(sp, 'order') === 'asc' ? 'asc' : 'desc',
  };
}

export const parseHotVideoSort = parseVideoSearchSort;

export function buildVideoSearchQueryString(
  params: Record<string, string | number | null | undefined>,
  omit: string[] = [],
): string {
  const search = new URLSearchParams();
  const omitted = new Set(omit);
  for (const [key, value] of Object.entries(params)) {
    if (omitted.has(key)) continue;
    if (value == null || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export const buildHotVideoQueryString = buildVideoSearchQueryString;

export type VideoSearchSortState = {
  sort?: VideoSearchSortField;
  order: VideoSearchSortOrder;
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
  regionCode?: string;
  dateParam?: string;
};

export function buildVideoSearchSortHref(
  basePath: string,
  sortField: VideoSearchSortField,
  current: VideoSearchSortState,
  omit: string[] = [],
): string {
  const nextOrder: VideoSearchSortOrder =
    current.sort === sortField
      ? current.order === 'desc'
        ? 'asc'
        : 'desc'
      : 'desc';

  return `${basePath}${buildVideoSearchQueryString(
    {
      q: current.q,
      date: current.date,
      regionCode: current.regionCode,
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
    },
    omit,
  )}`;
}

export function buildHotVideoSortHref(
  sortField: VideoSearchSortField,
  current: VideoSearchSortState & { date: string },
): string {
  return buildVideoSearchSortHref('/hot-videos', sortField, current);
}
