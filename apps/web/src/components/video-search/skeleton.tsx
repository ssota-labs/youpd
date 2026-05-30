import { Skeleton } from '@youpd/ui/components/ui/skeleton';

function GridCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="flex flex-col gap-3 p-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-6 rounded-full" />
          <div className="flex flex-1 flex-col gap-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-14" />
        </div>
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

export function VideoSearchGridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, index) => (
        <GridCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function VideoSearchChromeSkeleton() {
  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 lg:px-8 xl:px-10">
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 sm:px-6 lg:px-8 xl:px-10">
        <Skeleton className="h-8 min-w-[220px] flex-1" />
        <Skeleton className="h-8 w-[140px]" />
        <Skeleton className="h-8 w-[140px]" />
        <Skeleton className="h-8 w-[160px]" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="size-8" />
        <Skeleton className="size-8" />
        <Skeleton className="size-8" />
      </div>
    </>
  );
}

export function VideoSearchStatusBarSkeleton() {
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-4 w-56" />
    </div>
  );
}

export function VideoSearchPageSkeleton() {
  return (
    <>
      <div className="border-b border-border bg-background">
        <VideoSearchChromeSkeleton />
        <div className="flex flex-col gap-2 border-t border-border px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 xl:px-10">
          <VideoSearchStatusBarSkeleton />
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-5 w-20" />
            ))}
          </div>
        </div>
      </div>
      <div className="px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
        <VideoSearchGridSkeleton />
      </div>
    </>
  );
}
