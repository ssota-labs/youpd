'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
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
import { dedupeHotVideoRows, hotVideoRowKey } from '@/lib/hot-videos/row-key';
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
    source?: string | string[];
    isShort?: string;
    minPerformanceGrade?: string;
    minContributionGrade?: string;
    scoreLogic?: string;
    minSubscribers?: number;
    maxSubscribers?: number;
    minViews?: number;
    maxViews?: number;
    publishedAfter?: string;
    publishedBefore?: string;
    performanceGrades?: string;
    contributionGrades?: string;
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
  const [rows, setRows] = useState(() => dedupeHotVideoRows(videos));
  const [nextPage, setNextPage] = useState(page + 1);
  const [canLoadMore, setCanLoadMore] = useState(hasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    setRows(dedupeHotVideoRows(videos));
    setNextPage(page + 1);
    setCanLoadMore(hasMore);
    setLoadError(null);
    loadingRef.current = false;
  }, [videos, page, hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !canLoadMore) return;

    let cancelled = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        if (loadingRef.current) return;

        loadingRef.current = true;
        setIsLoadingMore(true);
        setLoadError(null);

        const source = Array.isArray(filters.source)
          ? filters.source.join(',')
          : filters.source;
        const query = buildHotVideoQueryString({
          ...filters,
          source,
          page: nextPage,
        });

        fetch(`/api/hot-videos${query}`)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Failed to load page ${nextPage}`);
            }
            return response.json() as Promise<{
              page: number;
              hasMore: boolean;
              videos: HotVideoRow[];
            }>;
          })
          .then((payload) => {
            if (cancelled) return;
            setRows((current) =>
              dedupeHotVideoRows([...current, ...payload.videos]),
            );
            setNextPage(payload.page + 1);
            setCanLoadMore(payload.hasMore);
          })
          .catch(() => {
            if (cancelled) return;
            setLoadError('다음 페이지를 불러오지 못했습니다.');
          })
          .finally(() => {
            loadingRef.current = false;
            if (cancelled) return;
            setIsLoadingMore(false);
          });
      },
      { rootMargin: '600px 0px', threshold: 0 },
    );

    observer.observe(sentinel);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [canLoadMore, filters, nextPage]);

  if (rows.length === 0) {
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

  return (
    <section className="flex flex-col gap-4">
      {view === 'grid' ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
          {rows.map((row) => (
            <HotVideoCard
              key={hotVideoRowKey(row)}
              row={row}
              categoryLabel={categoryLabel(categoryLabels, row.categoryId)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <HotVideoListRow
              key={hotVideoRowKey(row)}
              row={row}
              categoryLabel={categoryLabel(categoryLabels, row.categoryId)}
            />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="flex min-h-10 items-center justify-center border-t border-border pt-4">
        {isLoadingMore ? (
          <span className="text-xs text-muted-foreground">다음 핫비디오를 불러오는 중...</span>
        ) : loadError ? (
          <span className="text-xs text-destructive">{loadError}</span>
        ) : canLoadMore ? (
          <span className="text-xs text-muted-foreground">스크롤하면 더 불러옵니다</span>
        ) : (
          <span className="text-xs text-muted-foreground">모든 결과를 확인했습니다</span>
        )}
      </div>
    </section>
  );
}
