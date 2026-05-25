import { Suspense } from 'react';
import {
  HotVideosChromeSection,
  HotVideosResultsSection,
  HotVideosStatusBarSection,
} from '@/components/video-search/hot-videos-sections';
import { VideoSearchSortChips } from '@/components/video-search/sort-chips';
import {
  VideoSearchChromeSkeleton,
  VideoSearchGridSkeleton,
  VideoSearchStatusBarSkeleton,
} from '@/components/video-search/skeleton';
import { HOT_VIDEOS_SEARCH_CONFIG } from '@/lib/video-search/config';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function HotVideosPage({ searchParams }: PageProps) {
  const config = HOT_VIDEOS_SEARCH_CONFIG;

  return (
    <>
      <div className="border-b border-border bg-background">
        <Suspense fallback={<VideoSearchChromeSkeleton />}>
          <HotVideosChromeSection searchParams={searchParams} />
        </Suspense>

        <div className="flex flex-col gap-2 border-t border-border px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 xl:px-10">
          <Suspense fallback={<VideoSearchStatusBarSkeleton />}>
            <HotVideosStatusBarSection searchParams={searchParams} />
          </Suspense>
          <Suspense fallback={null}>
            <VideoSearchSortChips
              basePath={config.basePath}
              fields={config.fields}
            />
          </Suspense>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
        <Suspense fallback={<VideoSearchGridSkeleton />}>
          <HotVideosResultsSection searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
