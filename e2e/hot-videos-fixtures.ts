export const E2E_HOT_VIDEO_TITLES = {
  gaming: 'E2E Gaming Hot Video',
  vlog: 'E2E Vlog Hot Video',
  last: 'E2E Hot Video 30',
} as const;

export function getTodayInKorea(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** URL shape that previously returned zero rows because categoryId= was treated as a filter. */
export function buildBrokenDefaultFilterUrl(): string {
  const today = getTodayInKorea();
  const params = new URLSearchParams({
    q: '',
    date: today,
    categoryId: '',
    source: 'all',
    isShort: 'all',
    minSubscribers: '',
    maxSubscribers: '',
    minViews: '',
    maxViews: '',
    minPerformanceGrade: 'none',
    minContributionGrade: 'none',
    scoreLogic: 'or',
    view: 'grid',
  });
  return `/hot-videos?${params.toString()}`;
}
