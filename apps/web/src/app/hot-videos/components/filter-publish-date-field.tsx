'use client';

import { useMemo, useState } from 'react';
import { RiCalendarLine } from '@remixicon/react';
import { Line, LineChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { HotVideoPublishDateStats } from '@/lib/hot-videos/filter-stats';
import { getTodayInKorea } from '@/lib/hot-videos/today-korea';
import { cn } from '@/lib/utils';

type FilterPublishDateFieldProps = {
  stats: HotVideoPublishDateStats;
  formId: string;
  initialAfter?: string;
  initialBefore?: string;
};

const PRESETS = [
  { label: '1주', days: 7 },
  { label: '1달', days: 30 },
  { label: '3달', days: 90 },
  { label: '6달', days: 180 },
  { label: '12달', days: 365 },
] as const;

const publishChartConfig = {
  count: {
    label: '게시 영상',
    color: 'var(--color-muted-foreground)',
  },
} satisfies ChartConfig;

function shiftDate(base: string, days: number): string {
  const date = new Date(`${base}T00:00:00`);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function FilterPublishDateField({
  stats,
  formId,
  initialAfter,
  initialBefore,
}: FilterPublishDateFieldProps) {
  const today = getTodayInKorea();
  const [after, setAfter] = useState(initialAfter ?? '');
  const [before, setBefore] = useState(initialBefore ?? '');

  const chartData = useMemo(
    () =>
      stats.buckets.map((bucket, index) => ({
        index,
        label: bucket.label,
        monthKey: bucket.monthKey,
        count: bucket.count,
      })),
    [stats.buckets],
  );

  const maxCount = useMemo(
    () => Math.max(...chartData.map((point) => point.count), 1),
    [chartData],
  );

  const applyPreset = (days: number | null) => {
    if (days == null) {
      setAfter('');
      setBefore('');
      return;
    }

    setAfter(shiftDate(today, days));
    setBefore(today);
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">영상 게시일</p>
        {!stats.hasData ? (
          <span className="text-[0.625rem] text-muted-foreground">월별 미리보기</span>
        ) : null}
      </div>

      <ChartContainer
        config={publishChartConfig}
        className="aspect-auto h-20 w-full"
        initialDimension={{ width: 320, height: 80 }}
      >
        <LineChart
          accessibilityLayer
          data={chartData}
          margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
        >
          <XAxis dataKey="index" hide />
          <YAxis hide domain={[0, maxCount]} />
          <ChartTooltip
            cursor={{ stroke: 'var(--color-muted-foreground)', strokeWidth: 1, strokeDasharray: '4 4' }}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as (typeof chartData)[number] | undefined;
                  return row?.label ?? '';
                }}
              />
            }
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="var(--color-count)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: 'var(--color-count)' }}
          />
        </LineChart>
      </ChartContainer>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="relative">
          <RiCalendarLine className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            form={formId}
            type="date"
            name="publishedAfter"
            value={after}
            onChange={(event) => setAfter(event.target.value)}
            aria-label="게시일 시작"
            className="h-8 pl-8"
          />
        </div>
        <span className="text-xs text-muted-foreground">-</span>
        <div className="relative">
          <RiCalendarLine className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            form={formId}
            type="date"
            name="publishedBefore"
            value={before}
            onChange={(event) => setBefore(event.target.value)}
            aria-label="게시일 종료"
            className="h-8 pl-8"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {PRESETS.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => applyPreset(preset.days)}
          >
            {preset.label}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'h-7 px-2 text-xs',
            !after && !before && 'border-primary bg-primary/10 text-primary',
          )}
          onClick={() => applyPreset(null)}
        >
          전체
        </Button>
      </div>
    </div>
  );
}
