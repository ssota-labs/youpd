import Link from 'next/link';
import {
  keywordHarvestSearchConfig,
  type VideoSearchConfig,
} from '@/lib/video-search/config';
import { getProbeMetrics } from '@youpd/api/youtube';
import { loadKeywordHarvestPageData } from '@/lib/video-search/load-keyword-harvest-page-data';
import { VideoSearchChrome } from './chrome';
import { ProbeMetricsStrip } from './probe-metrics-strip';
import { VideoSearchResults } from './results';
import { VideoSearchStatusBar } from './status-bar';

function pickString(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = sp[key];
  return typeof value === 'string' ? value : undefined;
}

function buildClientFilters(
  filters: Awaited<ReturnType<typeof loadKeywordHarvestPageData>>['filters'],
  view: 'grid' | 'list',
  sort: Awaited<ReturnType<typeof loadKeywordHarvestPageData>>['sort'],
  order: Awaited<ReturnType<typeof loadKeywordHarvestPageData>>['order'],
) {
  return {
    q: filters.q,
    regionCode: filters.regionCode,
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

export async function KeywordHarvestMetricsSection({
  params,
}: {
  params: Promise<{ harvestId: string }>;
}) {
  const { harvestId } = await params;
  const result = await getProbeMetrics(harvestId);
  if (!result.data) return null;

  return <ProbeMetricsStrip harvestId={harvestId} metrics={result.data} />;
}

export async function KeywordHarvestChromeSection({
  params,
  searchParams,
}: {
  params: Promise<{ harvestId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { harvestId } = await params;
  const sp = await searchParams;
  const { filterStats, result, keyword } = await loadKeywordHarvestPageData(
    harvestId,
    sp,
  );

  const listDate = pickString(sp, 'date');
  const regionCode = pickString(sp, 'regionCode') ?? 'KR';
  const listHref = `/keywords${listDate ? `?date=${listDate}&regionCode=${regionCode}` : ''}`;

  const config: VideoSearchConfig = {
    ...keywordHarvestSearchConfig(harvestId, keyword),
    headerExtras: (
      <Link href={listHref} className="text-sm text-muted-foreground underline">
        목록으로
      </Link>
    ),
  };

  return (
    <VideoSearchChrome
      config={config}
      filterStats={filterStats}
      resultTotal={result.data.total}
    />
  );
}

export async function KeywordHarvestStatusBarSection({
  params,
  searchParams,
}: {
  params: Promise<{ harvestId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { harvestId } = await params;
  const sp = await searchParams;
  const { result, statusLabel, scoreIncomplete } =
    await loadKeywordHarvestPageData(harvestId, sp);

  return (
    <VideoSearchStatusBar
      total={result.data.total}
      loadedCount={result.data.videos.length}
      statusLabel={statusLabel}
      scoreIncomplete={scoreIncomplete}
    />
  );
}

export async function KeywordHarvestResultsSection({
  params,
  searchParams,
}: {
  params: Promise<{ harvestId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { harvestId } = await params;
  const sp = await searchParams;
  const { filters, view, sort, order, categoryLabels, result, keyword } =
    await loadKeywordHarvestPageData(harvestId, sp);
  const clientFilters = buildClientFilters(filters, view, sort, order);
  const config = keywordHarvestSearchConfig(harvestId, keyword);

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
      queryOmit={['date', 'categoryId', 'source']}
      harvestId={harvestId}
    />
  );
}
