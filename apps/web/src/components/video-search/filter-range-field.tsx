'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, Cell, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@youpd/ui/components/ui/chart';
import { Input } from '@youpd/ui/components/ui/input';
import { Slider } from '@youpd/ui/components/ui/slider';
import { formatCompactMetric, formatRangeBound } from '@/lib/video-search/format-metric';
import type { HotVideoMetricRangeStats } from '@/lib/video-search/filter-stats';

type FilterRangeFieldProps = {
  title: string;
  stats: HotVideoMetricRangeStats;
  filterable?: boolean;
  formId?: string;
  minName?: string;
  maxName?: string;
  initialMin?: string;
  initialMax?: string;
};

const histogramChartConfig = {
  count: {
    label: '영상 수',
    color: 'var(--color-muted-foreground)',
  },
} satisfies ChartConfig;

function parseBound(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function MetricHistogramChart({
  buckets,
  minValue,
  maxValue,
  sliderMax,
}: {
  buckets: HotVideoMetricRangeStats['buckets'];
  minValue: number;
  maxValue: number;
  sliderMax: number;
}) {
  const chartData = useMemo(
    () =>
      buckets.map((bucket, index) => ({
        index,
        count: bucket.count,
        start: bucket.start,
        end: bucket.end,
        inRange: bucket.end > minValue && bucket.start < maxValue,
      })),
    [buckets, minValue, maxValue],
  );

  return (
    <ChartContainer
      config={histogramChartConfig}
      className="aspect-auto h-20 w-full"
    >
      <BarChart
        accessibilityLayer
        data={chartData}
        margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
      >
        <XAxis dataKey="index" hide />
        <YAxis hide domain={[0, 'auto']} />
        <ChartTooltip
          cursor={{ fill: 'var(--color-muted)', opacity: 0.35 }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as (typeof chartData)[number] | undefined;
                if (!row) return '';
                return `${formatRangeBound(row.start)} ~ ${formatRangeBound(row.end, true, sliderMax)}`;
              }}
            />
          }
        />
        <Bar dataKey="count" radius={[2, 2, 0, 0]} minPointSize={2}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={
                entry.inRange
                  ? 'var(--color-muted-foreground)'
                  : 'var(--color-muted)'
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function FilterRangeField({
  title,
  stats,
  filterable = false,
  formId,
  minName,
  maxName,
  initialMin,
  initialMax,
}: FilterRangeFieldProps) {
  const { sliderMin, sliderMax, buckets, sum, average, median } = stats;
  const [range, setRange] = useState<[number, number]>(() => [
    clamp(parseBound(initialMin, sliderMin), sliderMin, sliderMax),
    clamp(parseBound(initialMax, sliderMax), sliderMin, sliderMax),
  ]);

  const [minValue, maxValue] = range;
  const minAtDefault = minValue <= sliderMin;
  const maxAtDefault = maxValue >= sliderMax;

  const updateRange = (next: [number, number]) => {
    const normalizedMin = clamp(next[0], sliderMin, sliderMax);
    const normalizedMax = clamp(Math.max(next[1], normalizedMin), sliderMin, sliderMax);
    setRange([normalizedMin, normalizedMax]);
  };

  const handleMinInput = (value: string) => {
    if (!value) {
      updateRange([sliderMin, maxValue]);
      return;
    }

    updateRange([Number(value), maxValue]);
  };

  const handleMaxInput = (value: string) => {
    if (!value) {
      updateRange([minValue, sliderMax]);
      return;
    }

    updateRange([minValue, Number(value)]);
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-xs font-medium">{title}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.625rem] text-muted-foreground">
          <span>합계 {formatCompactMetric(sum)}</span>
          <span aria-hidden="true">|</span>
          <span>평균값 {formatCompactMetric(average)}</span>
          <span aria-hidden="true">|</span>
          <span>중앙값 {formatCompactMetric(median)}</span>
        </div>
      </div>

      <MetricHistogramChart
        buckets={buckets}
        minValue={minValue}
        maxValue={maxValue}
        sliderMax={sliderMax}
      />

      <Slider
        min={sliderMin}
        max={sliderMax}
        step={Math.max(1, Math.round(sliderMax / 200))}
        value={range}
        onValueChange={(value) =>
          updateRange([value[0] ?? sliderMin, value[1] ?? sliderMax])
        }
        aria-label={title}
        className="[&_[data-slot=slider-range]]:bg-neutral-500 [&_[data-slot=slider-thumb]]:border-neutral-400 dark:[&_[data-slot=slider-range]]:bg-neutral-400 [&_[data-slot=slider-thumb]]:bg-background"
      />

      {filterable && formId && minName && maxName ? (
        <div className="flex items-center gap-2">
          <Input
            form={formId}
            name={minName}
            type="number"
            min={sliderMin}
            max={sliderMax}
            inputMode="numeric"
            aria-label={`${title} 최소`}
            value={minAtDefault ? '' : String(minValue)}
            onChange={(event) => handleMinInput(event.target.value)}
            className="h-8"
          />
          <span className="text-xs text-muted-foreground">-</span>
          <Input
            form={formId}
            name={maxName}
            type="number"
            min={sliderMin}
            max={sliderMax}
            inputMode="numeric"
            aria-label={`${title} 최대`}
            value={maxAtDefault ? '' : String(maxValue)}
            placeholder={formatRangeBound(sliderMax, true, sliderMax)}
            onChange={(event) => handleMaxInput(event.target.value)}
            className="h-8"
          />
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatRangeBound(minValue)}</span>
          <span>{formatRangeBound(maxValue, true, sliderMax)}</span>
        </div>
      )}
    </div>
  );
}
