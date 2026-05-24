import { Suspense } from 'react';
import { listTrendingChartTargets } from '@youpd/api/youtube';
import { HotVideoResultsSection } from './components/hot-video-results-section';
import { HotVideoSortChips } from './components/hot-video-sort-chips';
import { HotVideoStatusBar } from './components/hot-video-status-bar';
import {
  HotVideoChromeSkeleton,
  HotVideoGridSkeleton,
  HotVideoStatusBarSkeleton,
} from './components/hot-video-skeleton';
import { HotVideosChromeSection } from './components/hot-videos-chrome-section';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function HotVideosPage({ searchParams }: PageProps) {
  const categories = listTrendingChartTargets({ regionCodes: ['KR'] });

  return (
    <>
      <div className="border-b border-border bg-background">
        <Suspense fallback={<HotVideoChromeSkeleton />}>
          <HotVideosChromeSection
            categories={categories}
            searchParams={searchParams}
          />
        </Suspense>

        <div className="flex flex-col gap-2 border-t border-border px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 xl:px-10">
          <Suspense fallback={<HotVideoStatusBarSkeleton />}>
            <HotVideoStatusBar searchParams={searchParams} />
          </Suspense>
          <Suspense fallback={null}>
            <HotVideoSortChips />
          </Suspense>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
        <Suspense fallback={<HotVideoGridSkeleton />}>
          <HotVideoResultsSection searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
