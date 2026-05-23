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

  return (
    <HotVideoResults
      videos={result.data.videos}
      view={view}
      categoryLabels={categoryLabels}
      page={result.data.page}
      hasMore={result.data.hasMore}
      filters={{
        q: filters.q,
        date: filters.date!,
        categoryId: filters.categoryId,
        view,
        sort,
        order: sort ? order : undefined,
      }}
    />
  );
}
