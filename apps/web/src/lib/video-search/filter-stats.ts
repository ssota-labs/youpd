import type { HotVideoRow } from '@youpd/api/youtube';
import { getTodayInKorea } from './today-korea';

export type HotVideoFilterBucket = {
  label: string;
  count: number;
  start: number;
  end: number;
};

export type HotVideoMetricRangeStats = {
  sum: number;
  average: number;
  median: number;
  sliderMin: number;
  sliderMax: number;
  buckets: HotVideoFilterBucket[];
};

export type HotVideoPublishDateBucket = {
  label: string;
  monthKey: string;
  count: number;
  isPlaceholder?: boolean;
};

export type HotVideoPublishDateStats = {
  buckets: HotVideoPublishDateBucket[];
  minDate: string | null;
  maxDate: string | null;
  hasData: boolean;
};

export type HotVideoFilterStats = {
  views: HotVideoMetricRangeStats;
  subscribers: HotVideoMetricRangeStats;
  likes: HotVideoMetricRangeStats;
  publishedAt: HotVideoPublishDateStats;
  contributionGrades: HotVideoFilterBucket[];
  performanceGrades: HotVideoFilterBucket[];
};

const GRADE_LABELS = ['Worst', 'Bad', 'Normal', 'Good', 'Great'] as const;
const HISTOGRAM_BUCKET_COUNT = 24;
const MAX_PUBLISH_MONTH_BUCKETS = 36;
const PLACEHOLDER_PUBLISH_MONTH_COUNT = 12;

function roundUpSliderMax(value: number, floor: number): number {
  if (value <= 0) return floor;

  const steps = [1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000];
  for (const step of steps) {
    if (value <= step) return Math.max(step, floor);
  }

  const magnitude = 10 ** Math.ceil(Math.log10(value));
  return Math.max(magnitude, floor);
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1]! + sorted[middle]!) / 2;
  }

  return sorted[middle]!;
}

function buildHistogramBuckets(
  values: number[],
  sliderMax: number,
): HotVideoFilterBucket[] {
  const bucketSize = sliderMax / HISTOGRAM_BUCKET_COUNT;

  return Array.from({ length: HISTOGRAM_BUCKET_COUNT }, (_, index) => {
    const start = index * bucketSize;
    const end = index === HISTOGRAM_BUCKET_COUNT - 1 ? sliderMax : (index + 1) * bucketSize;
    const count = values.filter((value) => {
      if (index === HISTOGRAM_BUCKET_COUNT - 1) {
        return value >= start && value <= end;
      }
      return value >= start && value < end;
    }).length;

    return {
      label: `${Math.round(start)}-${Math.round(end)}`,
      count,
      start,
      end,
    };
  });
}

function buildMetricRangeStats(
  values: number[],
  sliderFloor: number,
): HotVideoMetricRangeStats {
  const sliderMax = roundUpSliderMax(Math.max(...values, 0), sliderFloor);
  const sum = values.reduce((total, value) => total + value, 0);
  const average = values.length > 0 ? sum / values.length : 0;
  const median = computeMedian(values);

  return {
    sum,
    average,
    median,
    sliderMin: 0,
    sliderMax,
    buckets: buildHistogramBuckets(values, sliderMax),
  };
}

function countGrades(
  rows: HotVideoRow[],
  getGrade: (row: HotVideoRow) => string | undefined,
): HotVideoFilterBucket[] {
  return GRADE_LABELS.map((label, index) => ({
    label,
    count: rows.filter((row) => getGrade(row) === label).length,
    start: index,
    end: index + 1,
  }));
}

function extractMetricValues(
  rows: HotVideoRow[],
  getValue: (row: HotVideoRow) => number | null | undefined,
): number[] {
  return rows
    .map(getValue)
    .filter((value): value is number => value != null && Number.isFinite(value));
}

function toDateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function toMonthKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

function shiftMonth(monthKey: string, delta: number): string {
  const [yearRaw, monthRaw] = monthKey.split('-');
  let year = Number(yearRaw);
  let month = Number(monthRaw) + delta;

  while (month < 1) {
    month += 12;
    year -= 1;
  }
  while (month > 12) {
    month -= 12;
    year += 1;
  }

  return `${year}-${String(month).padStart(2, '0')}`;
}

function iterateMonthKeys(startMonth: string, endMonth: string): string[] {
  const months: string[] = [];
  let cursor = startMonth;

  while (cursor <= endMonth) {
    months.push(cursor);
    cursor = shiftMonth(cursor, 1);
  }

  return months;
}

function formatMonthLabel(monthKey: string, spanMultipleYears: boolean): string {
  const [year, month] = monthKey.split('-');
  if (spanMultipleYears) {
    return `${year.slice(2)}.${month}`;
  }
  return `${Number(month)}월`;
}

function buildPlaceholderMonthBuckets(
  count = PLACEHOLDER_PUBLISH_MONTH_COUNT,
): HotVideoPublishDateBucket[] {
  const endMonth = toMonthKey(getTodayInKorea());
  const startMonth = shiftMonth(endMonth, -(count - 1));
  const monthKeys = iterateMonthKeys(startMonth, endMonth);
  const spanMultipleYears =
    monthKeys[0]?.slice(0, 4) !== monthKeys[monthKeys.length - 1]?.slice(0, 4);

  return monthKeys.map((monthKey) => ({
    monthKey,
    label: formatMonthLabel(monthKey, spanMultipleYears),
    count: 0,
    isPlaceholder: true,
  }));
}

function trimMonthBuckets(
  buckets: HotVideoPublishDateBucket[],
): HotVideoPublishDateBucket[] {
  if (buckets.length <= MAX_PUBLISH_MONTH_BUCKETS) return buckets;
  return buckets.slice(-MAX_PUBLISH_MONTH_BUCKETS);
}

function buildPublishDateStats(rows: HotVideoRow[]): HotVideoPublishDateStats {
  const dates = rows
    .map((row) => toDateKey(row.video?.publishedAt))
    .filter((value): value is string => value != null);

  if (dates.length === 0) {
    return {
      buckets: buildPlaceholderMonthBuckets(),
      minDate: null,
      maxDate: null,
      hasData: false,
    };
  }

  const monthKeys = dates.map(toMonthKey);
  const counts = monthKeys.reduce<Record<string, number>>((acc, monthKey) => {
    acc[monthKey] = (acc[monthKey] ?? 0) + 1;
    return acc;
  }, {});

  const sortedMonthKeys = Object.keys(counts).sort();
  const startMonth = sortedMonthKeys[0]!;
  const endMonth = sortedMonthKeys[sortedMonthKeys.length - 1]!;
  const allMonthKeys = iterateMonthKeys(startMonth, endMonth);
  const spanMultipleYears = startMonth.slice(0, 4) !== endMonth.slice(0, 4);

  const buckets = trimMonthBuckets(
    allMonthKeys.map((monthKey) => ({
      monthKey,
      label: formatMonthLabel(monthKey, spanMultipleYears),
      count: counts[monthKey] ?? 0,
    })),
  );

  const sortedDates = [...dates].sort();

  return {
    buckets,
    minDate: sortedDates[0] ?? null,
    maxDate: sortedDates[sortedDates.length - 1] ?? null,
    hasData: true,
  };
}

export function buildHotVideoFilterStats(
  rows: HotVideoRow[],
): HotVideoFilterStats {
  const views = extractMetricValues(rows, (row) => row.video?.metrics.views);
  const subscribers = extractMetricValues(
    rows,
    (row) => row.channel?.subscriberCount,
  );
  const likes = extractMetricValues(rows, (row) => row.video?.metrics.likes);

  return {
    views: buildMetricRangeStats(views, 1_000_000),
    subscribers: buildMetricRangeStats(subscribers, 1_000_000),
    likes: buildMetricRangeStats(likes, 100_000),
    publishedAt: buildPublishDateStats(rows),
    contributionGrades: countGrades(
      rows,
      (row) => row.video?.score.contribution.grade,
    ),
    performanceGrades: countGrades(
      rows,
      (row) => row.video?.score.performance.grade,
    ),
  };
}
