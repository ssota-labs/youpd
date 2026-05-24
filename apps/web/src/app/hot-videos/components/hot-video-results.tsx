import Link from 'next/link';
import { RiVideoLine } from '@remixicon/react';
import type { HotVideoRow } from '@youpd/api/youtube';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { buildHotVideoQueryString, type HotVideoSortField, type HotVideoSortOrder } from '@/lib/hot-videos/query-string';
import { HotVideoCard, HotVideoListRow } from './hot-video-card';

type HotVideoResultsProps = {
  videos: HotVideoRow[];
  view: 'grid' | 'list';
  categoryLabels: Record<string, string>;
  page: number;
  hasMore: boolean;
  filters: {
    q?: string;
    date: string;
    categoryId?: string | null;
    view: 'grid' | 'list';
    sort?: HotVideoSortField;
    order?: HotVideoSortOrder;
  };
};

function categoryLabel(
  categoryLabels: Record<string, string>,
  categoryId: string | null,
): string | undefined {
  if (!categoryId) return undefined;
  return categoryLabels[categoryId];
}

export function HotVideoResults({
  videos,
  view,
  categoryLabels,
  page,
  hasMore,
  filters,
}: HotVideoResultsProps) {
  if (videos.length === 0) {
    return (
      <Empty className="border border-dashed border-border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RiVideoLine />
          </EmptyMedia>
          <EmptyTitle>조건에 맞는 핫비디오가 없습니다</EmptyTitle>
          <EmptyDescription>
            날짜, 카테고리, 검색어를 바꿔보세요. 일일 트렌딩 수집 cron이
            아직 실행되지 않았을 수도 있습니다.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hot-videos">필터 초기화</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const paginationBase = {
    q: filters.q,
    date: filters.date,
    categoryId: filters.categoryId ?? undefined,
    view: filters.view,
    sort: filters.sort,
    order: filters.sort ? filters.order : undefined,
  };

  return (
    <section className="flex flex-col gap-4">
      {view === 'grid' ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
          {videos.map((row) => (
            <HotVideoCard
              key={`${row.hotDate}-${row.categoryId}-${row.video?.id}`}
              row={row}
              categoryLabel={categoryLabel(categoryLabels, row.categoryId)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {videos.map((row) => (
            <HotVideoListRow
              key={`${row.hotDate}-${row.categoryId}-${row.video?.id}`}
              row={row}
              categoryLabel={categoryLabel(categoryLabels, row.categoryId)}
            />
          ))}
        </div>
      )}

      <nav className="flex items-center justify-between border-t border-border pt-4">
        {page > 1 ? (
          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/hot-videos${buildHotVideoQueryString({ ...paginationBase, page: page - 1 })}`}
            >
              이전
            </Link>
          </Button>
        ) : (
          <span />
        )}
        <span className="text-xs text-muted-foreground">페이지 {page}</span>
        {hasMore ? (
          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/hot-videos${buildHotVideoQueryString({ ...paginationBase, page: page + 1 })}`}
            >
              다음
            </Link>
          </Button>
        ) : (
          <span />
        )}
      </nav>
    </section>
  );
}
