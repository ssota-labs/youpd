import { loadHotVideoPageData } from '@/lib/hot-videos/load-page-data';
import { HotVideosChrome } from './hot-videos-chrome';

type CategoryOption = {
  categoryId: string;
  titleKo: string;
};

type HotVideosChromeSectionProps = {
  categories: CategoryOption[];
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function HotVideosChromeSection({
  categories,
  searchParams,
}: HotVideosChromeSectionProps) {
  const sp = await searchParams;
  const { filterStats, result } = await loadHotVideoPageData(sp);

  return (
    <HotVideosChrome
      categories={categories}
      filterStats={filterStats}
      resultTotal={result.data.total}
    />
  );
}
