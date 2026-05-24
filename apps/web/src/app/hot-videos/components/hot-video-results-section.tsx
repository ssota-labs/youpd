import { loadHotVideoPageData } from '@/lib/hot-videos/load-page-data';
import { HotVideoResults } from './hot-video-results';

type HotVideoResultsSectionProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function HotVideoResultsSection({
  searchParams,
}: HotVideoResultsSectionProps) {
  const sp = await searchParams;
  const { filters, view, sort, order, categoryLabels, result } =
    await loadHotVideoPageData(sp);
  const clientFilters = {
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

  return (
    <HotVideoResults
      key={JSON.stringify(clientFilters)}
      videos={result.data.videos}
      view={view}
      categoryLabels={categoryLabels}
      page={result.data.page}
      hasMore={result.data.hasMore}
      filters={clientFilters}
    />
  );
}
