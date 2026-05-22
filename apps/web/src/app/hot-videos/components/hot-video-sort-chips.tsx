'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  RiArrowDownSLine,
  RiArrowUpDownLine,
  RiArrowUpSLine,
  RiCalendarLine,
  RiEyeLine,
  RiFilmLine,
  RiStarLine,
  RiTimeLine,
  RiUserLine,
} from '@remixicon/react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { readHotVideoUrlState } from '@/lib/hot-videos/read-search-params';
import {
  buildHotVideoSortHref,
  type HotVideoSortField,
} from '@/lib/hot-videos/query-string';

const SORT_OPTIONS = [
  { key: 'views' as const, label: '조회수', icon: RiEyeLine },
  { key: 'subscribers' as const, label: '구독자', icon: RiUserLine },
  { key: 'contribution' as const, label: '기여도', icon: RiStarLine },
  { key: 'performance' as const, label: '성과도', icon: RiArrowUpDownLine },
  { key: 'duration' as const, label: '영상 길이', icon: RiTimeLine },
  { key: 'videoCount' as const, label: '총 영상 수', icon: RiFilmLine },
  { key: 'publishedAt' as const, label: '게시일', icon: RiCalendarLine },
] satisfies ReadonlyArray<{
  key: HotVideoSortField;
  label: string;
  icon: typeof RiEyeLine;
}>;

export function HotVideoSortChips() {
  const searchParams = useSearchParams();
  const { q, date, dateEnd, categoryId, view, sort, order } =
    readHotVideoUrlState(searchParams);
  const filterState = { sort, order, q, date, dateEnd, categoryId, view };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {SORT_OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = sort === option.key;
        const DirectionIcon =
          active && order === 'asc' ? RiArrowUpSLine : RiArrowDownSLine;

        return (
          <Tooltip key={option.key}>
            <TooltipTrigger asChild>
              <Button
                variant={active ? 'default' : 'outline'}
                size="xs"
                asChild
                aria-label={`${option.label} 정렬${active ? (order === 'asc' ? ' 오름차순' : ' 내림차순') : ''}`}
                aria-pressed={active}
              >
                <Link href={buildHotVideoSortHref(option.key, filterState)}>
                  <Icon data-icon="inline-start" />
                  {option.label}
                  {active ? <DirectionIcon data-icon="inline-end" /> : null}
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {active
                ? order === 'desc'
                  ? '내림차순 · 클릭하면 오름차순'
                  : '오름차순 · 클릭하면 내림차순'
                : `${option.label} 기준 정렬`}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
