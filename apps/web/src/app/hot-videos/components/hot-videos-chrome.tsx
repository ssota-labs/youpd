'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  RiCalendarLine,
  RiLayoutGridLine,
  RiListUnordered,
  RiPriceTag3Line,
  RiRefreshLine,
  RiSearchLine,
} from '@remixicon/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
      <input
        type="hidden"
        name="categoryId"
        value={selectedCategory === 'all' ? '' : selectedCategory}
      />
    </>
  );
}

export function HotVideosChrome({ categories }: HotVideosChromeProps) {
  const searchParams = useSearchParams();
  const { q, date, dateEnd, categoryId, view, sort, order } =
    readHotVideoUrlState(searchParams);

  const viewQuery = (nextView: HotVideoViewMode) =>
    buildHotVideoQueryString({
      q,
      date,
      dateEnd,
      categoryId: categoryId ?? undefined,
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
              defaultValue={date ?? ''}
              key={`date-${date ?? ''}`}
              aria-label="시작일"
              className="h-8 w-[140px] pl-8"
            />
          </div>

          <div className="relative">
            <RiCalendarLine className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              name="dateEnd"
              defaultValue={dateEnd ?? ''}
              key={`dateEnd-${dateEnd ?? ''}`}
              aria-label="종료일"
              className="h-8 w-[140px] pl-8"
            />
          </div>

        <CategorySelect
          key={categoryId ?? 'all'}
          initialCategory={categoryId ?? 'all'}
          categories={categories}
        />

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
