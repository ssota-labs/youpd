import { listTrendingChartTargets } from '@youpd/api/youtube';
import {
  HOT_VIDEOS_SEARCH_CONFIG,
  type VideoSearchConfig,
} from '@/lib/video-search/config';
import { loadHotVideoPageData } from '@/lib/video-search/load-page-data';
import { VideoSearchChrome } from './chrome';
import { VideoSearchResults } from './results';
import { VideoSearchStatusBar } from './status-bar';

function buildClientFilters(
  filters: Awaited<ReturnType<typeof loadHotVideoPageData>>['filters'],
  view: 'grid' | 'list',
  sort: Awaited<ReturnType<typeof loadHotVideoPageData>>['sort'],
  order: Awaited<ReturnType<typeof loadHotVideoPageData>>['order'],
) {
  return {
    q: filters.q,
    date: filters.date!,
    categoryId: filters.categoryId,
    source: filters.source,
    isShort:
      filters.isShort === undefined
        ? undefined
        : filters.isShort === null
          ? 'all'
          : String(filters.isShort),
    minPerformanceGrade: filters.minPerformanceGrade ?? undefined,
    minContributionGrade: filters.minContributionGrade ?? undefined,
    scoreLogic: filters.scoreLogic,
    minSubscribers: filters.minSubscribers,
    maxSubscribers: filters.maxSubscribers,
    minViews: filters.minViews,
    maxViews: filters.maxViews,
    publishedAfter: filters.publishedAfter,
    publishedBefore: filters.publishedBefore,
    performanceGrades: filters.performanceGrades?.join(','),
    contributionGrades: filters.contributionGrades?.join(','),
    view,
    sort,
    order: sort ? order : undefined,
  };
}

export async function HotVideosChromeSection({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { filterStats, result } = await loadHotVideoPageData(sp);
  const categories = listTrendingChartTargets({ regionCodes: ['KR'] });
  const config: VideoSearchConfig = HOT_VIDEOS_SEARCH_CONFIG;

  return (
    <VideoSearchChrome
      config={config}
      categories={categories}
      filterStats={filterStats}
      resultTotal={result.data.total}
    />
  );
}

export async function HotVideosStatusBarSection({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { result, statusLabel, scoreIncomplete } = await loadHotVideoPageData(sp);

  return (
    <VideoSearchStatusBar
      total={result.data.total}
      loadedCount={result.data.videos.length}
      statusLabel={statusLabel}
      scoreIncomplete={scoreIncomplete}
    />
  );
}

export async function HotVideosResultsSection({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { filters, view, sort, order, categoryLabels, result } =
    await loadHotVideoPageData(sp);
  const clientFilters = buildClientFilters(filters, view, sort, order);
  const config = HOT_VIDEOS_SEARCH_CONFIG;

  return (
    <VideoSearchResults
      key={JSON.stringify(clientFilters)}
      videos={result.data.videos}
      view={view}
      categoryLabels={categoryLabels}
      page={result.data.page}
      hasMore={result.data.hasMore}
      apiPath={config.apiPath}
      resetHref={config.resetHref ?? config.basePath}
      filters={clientFilters}
    />
  );
}
