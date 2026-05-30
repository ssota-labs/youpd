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
import { Badge } from '@youpd/ui/components/ui/badge';
import { Button } from '@youpd/ui/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@youpd/ui/components/ui/dialog';
import { Input } from '@youpd/ui/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@youpd/ui/components/ui/select';
import { Separator } from '@youpd/ui/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@youpd/ui/components/ui/tooltip';
import type { VideoSearchConfig } from '@/lib/video-search/config';
import type { HotVideoFilterStats } from '@/lib/video-search/filter-stats';
import { readVideoSearchUrlState } from '@/lib/video-search/read-search-params';
import {
  buildVideoSearchQueryString,
  type VideoSearchViewMode,
} from '@/lib/video-search/query-string';
import {
  countActiveAdvancedFilters,
  VIDEO_SEARCH_FILTER_FORM_ID,
  VideoSearchFilterPanel,
} from './filter-panel';

type CategoryOption = {
  categoryId: string;
  titleKo: string;
};

type VideoSearchChromeProps = {
  config: VideoSearchConfig;
  categories?: CategoryOption[];
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
      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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

export function VideoSearchChrome({
  config,
  categories = [],
  filterStats,
  resultTotal,
}: VideoSearchChromeProps) {
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
    regionCode,
  } = readVideoSearchUrlState(searchParams, config.fields);

  const queryOmit = [
    ...(config.fields.date ? [] : ['date']),
    ...(config.fields.categoryId ? [] : ['categoryId']),
    ...(config.fields.source ? [] : ['source']),
  ];

  const activeAdvancedFilterCount = countActiveAdvancedFilters({
    source: config.fields.source ? source : undefined,
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

  const viewQuery = (nextView: VideoSearchViewMode) =>
    buildVideoSearchQueryString(
      {
        q,
        date,
        regionCode,
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
      },
      queryOmit,
    );

  return (
    <>
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight">{config.title}</span>
          {q ? (
            <Badge variant="secondary" className="max-w-[240px] truncate">
              {q}
            </Badge>
          ) : null}
        </div>
        {config.headerExtras ? (
          <div className="flex items-center gap-2">{config.headerExtras}</div>
        ) : null}
      </header>

      <form
        id={VIDEO_SEARCH_FILTER_FORM_ID}
        method="get"
        className="flex flex-wrap items-center gap-2 px-4 py-2 sm:px-6 lg:px-8 xl:px-10"
      >
        {config.fields.q ? (
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
        ) : null}

        {config.fields.date ? (
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
        ) : null}

        {config.fields.categoryId ? (
          <CategorySelect
            key={categoryId ?? 'all'}
            initialCategory={categoryId ?? 'all'}
            categories={categories}
          />
        ) : null}

        {regionCode ? (
          <input type="hidden" name="regionCode" value={regionCode} />
        ) : null}

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
              <VideoSearchFilterPanel
                filterStats={filterStats}
                showSource={config.fields.source}
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
              <Button type="submit" form={VIDEO_SEARCH_FILTER_FORM_ID} size="lg">
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
              <Link
                href={config.resetHref ?? config.basePath}
                aria-label="초기화"
              >
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
                <Link
                  href={`${config.basePath}${viewQuery('grid')}`}
                  aria-label="그리드"
                >
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
                <Link
                  href={`${config.basePath}${viewQuery('list')}`}
                  aria-label="리스트"
                >
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
