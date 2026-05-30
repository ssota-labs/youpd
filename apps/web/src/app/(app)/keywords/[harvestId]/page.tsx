import { Suspense } from 'react';
import {
  KeywordHarvestChromeSection,
  KeywordHarvestResultsSection,
  KeywordHarvestStatusBarSection,
} from '@/components/video-search/keyword-harvest-sections';
import { VideoSearchSortChips } from '@/components/video-search/sort-chips';
import {
  VideoSearchChromeSkeleton,
  VideoSearchGridSkeleton,
  VideoSearchStatusBarSkeleton,
} from '@/components/video-search/skeleton';

type PageProps = {
  params: Promise<{ harvestId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function KeywordHarvestDetailPage({
  params,
  searchParams,
}: PageProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-background">
        <Suspense fallback={<VideoSearchChromeSkeleton />}>
          <KeywordHarvestChromeSection
            params={params}
            searchParams={searchParams}
          />
        </Suspense>

        <div className="flex flex-col gap-2 border-t border-border px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 xl:px-10">
          <Suspense fallback={<VideoSearchStatusBarSkeleton />}>
            <KeywordHarvestStatusBarSection
              params={params}
              searchParams={searchParams}
            />
          </Suspense>
          <Suspense fallback={null}>
            <KeywordHarvestSortChips params={params} />
          </Suspense>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
        <Suspense fallback={<VideoSearchGridSkeleton />}>
          <KeywordHarvestResultsSection
            params={params}
            searchParams={searchParams}
          />
        </Suspense>
      </div>
    </div>
  );
}

async function KeywordHarvestSortChips({
  params,
}: {
  params: Promise<{ harvestId: string }>;
}) {
  const { harvestId } = await params;

  return (
    <VideoSearchSortChips
      basePath={`/keywords/${harvestId}`}
      fields={{
        q: true,
        date: false,
        categoryId: false,
        source: false,
      }}
    />
  );
}
