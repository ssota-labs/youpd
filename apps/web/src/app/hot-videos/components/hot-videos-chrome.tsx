'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  RiCalendarLine,
  RiFilter3Line,
  RiLayoutGridLine,
  RiListUnordered,
  RiPriceTag3Line,
  RiRefreshLine,
  RiSearchLine,
} from '@remixicon/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  countActiveAdvancedFilters,
  HOT_VIDEOS_FILTER_FORM_ID,
  HotVideosFilterPanel,
} from './hot-videos-filter-panel';
import type { HotVideoFilterStats } from '@/lib/hot-videos/filter-stats';
import { readHotVideoUrlState } from '@/lib/hot-videos/read-search-params';
import {
  buildHotVideoQueryString,
  type HotVideoViewMode,
} from '@/lib/hot-videos/query-string';

type CategoryOption = {
  categoryId: string;
  titleKo: string;
};

type HotVideosChromeProps = {
  categories: CategoryOption[];
  filterStats: HotVideoFilterStats;
  resultTotal: number;
};

type CategorySelectProps = {
  initialCategory: string;
  categories: CategoryOption[];
};

function CategorySelect({
  initialCategory,
  categories,
}: CategorySelectProps) {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  return (
    <>
      <Select
        value={selectedCategory}
        onValueChange={setSelectedCategory}
      >
        <SelectTrigger className="h-8 w-[160px]" aria-label="카테고리">
          <RiPriceTag3Line className="size-3.5 text-muted-foreground" />
          <SelectValue placeholder="카테고리" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="all">전체 카테고리</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.categoryId} value={category.categoryId}>
                {category.titleKo}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <input type="hidden" name="categoryId" value={selectedCategory} />
    </>
  );
}

export function HotVideosChrome({
  categories,
  filterStats,
  resultTotal,
}: HotVideosChromeProps) {
  const searchParams = useSearchParams();
  const {
    q,
    date,
    categoryId,
    source,
    isShort,
    minPerformanceGrade,
    minContributionGrade,
    performanceGrades,
    contributionGrades,
    scoreLogic,
    minSubscribers,
    maxSubscribers,
    minViews,
    maxViews,
    publishedAfter,
    publishedBefore,
    view,
    sort,
    order,
  } = readHotVideoUrlState(searchParams);
  const activeAdvancedFilterCount = countActiveAdvancedFilters({
    source,
    isShort,
    minPerformanceGrade,
    minContributionGrade,
    performanceGrades,
    contributionGrades,
    scoreLogic,
    minSubscribers,
    maxSubscribers,
    minViews,
    maxViews,
    publishedAfter,
    publishedBefore,
  });

  const viewQuery = (nextView: HotVideoViewMode) =>
    buildHotVideoQueryString({
      q,
      date,
      categoryId: categoryId ?? undefined,
      source,
      isShort,
      minPerformanceGrade,
      minContributionGrade,
      performanceGrades,
      contributionGrades,
      scoreLogic,
      minSubscribers,
      maxSubscribers,
      minViews,
      maxViews,
      publishedAfter,
      publishedBefore,
      view: nextView,
      sort,
      order: sort ? order : undefined,
    });

  return (
    <>
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight">Hot Videos</span>
          {q ? (
            <Badge variant="secondary" className="max-w-[240px] truncate">
              {q}
            </Badge>
          ) : null}
        </div>
      </header>

      <form
        id={HOT_VIDEOS_FILTER_FORM_ID}
        method="get"
        className="flex flex-wrap items-center gap-2 px-4 py-2 sm:px-6 lg:px-8 xl:px-10"
      >
          <div className="relative min-w-[220px] flex-1">
            <RiSearchLine className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              defaultValue={q ?? ''}
              key={`q-${q ?? ''}`}
              placeholder="영상 또는 채널 검색"
              aria-label="영상 / 채널 검색"
              className="h-8 pl-8"
            />
          </div>

          <div className="relative">
            <RiCalendarLine className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              name="date"
              defaultValue={date}
              key={`date-${date}`}
              aria-label="날짜"
              className="h-8 w-[140px] pl-8"
            />
          </div>

        <CategorySelect
          key={categoryId ?? 'all'}
          initialCategory={categoryId ?? 'all'}
          categories={categories}
        />

          <Dialog>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant={activeAdvancedFilterCount > 0 ? 'secondary' : 'outline'}
                size="lg"
              >
                <RiFilter3Line data-icon="inline-start" />
                상세 필터
                {activeAdvancedFilterCount > 0 ? (
                  <Badge variant="default">{activeAdvancedFilterCount}</Badge>
                ) : null}
              </Button>
            </DialogTrigger>

            <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
              <DialogHeader className="border-b border-border px-4 py-3">
                <DialogTitle>상세 필터</DialogTitle>
                <DialogDescription>
                  현재 로드된 결과 기준 분포 · 전체{' '}
                  {resultTotal.toLocaleString('ko-KR')}건
                </DialogDescription>
              </DialogHeader>

              <div className="overflow-y-auto">
                <HotVideosFilterPanel
                  filterStats={filterStats}
                  source={source}
                  isShort={isShort}
                  scoreLogic={scoreLogic}
                  minSubscribers={minSubscribers}
                  maxSubscribers={maxSubscribers}
                  minViews={minViews}
                  maxViews={maxViews}
                  publishedAfter={publishedAfter}
                  publishedBefore={publishedBefore}
                  performanceGrades={performanceGrades}
                  contributionGrades={contributionGrades}
                  minPerformanceGrade={minPerformanceGrade}
                  minContributionGrade={minContributionGrade}
                />
              </div>

              <DialogFooter className="border-t border-border px-4 py-3">
                <DialogClose asChild>
                  <Button type="button" variant="outline" size="lg">
                    닫기
                  </Button>
                </DialogClose>
                <Button type="submit" form={HOT_VIDEOS_FILTER_FORM_ID} size="lg">
                  <RiSearchLine data-icon="inline-start" />
                  필터 적용
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <input type="hidden" name="view" value={view} />
          {sort ? <input type="hidden" name="sort" value={sort} /> : null}
          {sort ? <input type="hidden" name="order" value={order} /> : null}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="submit" size="sm" className="h-8">
                <RiSearchLine data-icon="inline-start" />
                검색
              </Button>
            </TooltipTrigger>
            <TooltipContent>필터 적용</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon-sm" asChild>
                <Link href="/hot-videos" aria-label="초기화">
                  <RiRefreshLine />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>초기화</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={view === 'grid' ? 'default' : 'outline'}
                  size="icon-sm"
                  asChild
                >
                  <Link href={`/hot-videos${viewQuery('grid')}`} aria-label="그리드">
                    <RiLayoutGridLine />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>그리드 보기</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={view === 'list' ? 'default' : 'outline'}
                  size="icon-sm"
                  asChild
                >
                  <Link href={`/hot-videos${viewQuery('list')}`} aria-label="리스트">
                    <RiListUnordered />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>리스트 보기</TooltipContent>
            </Tooltip>
        </div>
      </form>
    </>
  );
}
