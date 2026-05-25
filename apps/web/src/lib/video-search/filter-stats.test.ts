import { describe, expect, it } from 'vitest';
import { buildHotVideoFilterStats } from './filter-stats';
import { formatCompactMetric } from './format-metric';

describe('formatCompactMetric', () => {
  it('formats large values in Korean units', () => {
    expect(formatCompactMetric(2_430_000_000)).toBe('24.3억');
    expect(formatCompactMetric(3_622_000)).toBe('362.2만');
    expect(formatCompactMetric(88_000)).toBe('8.8만');
  });
});

describe('buildHotVideoFilterStats', () => {
  it('builds 24 histogram buckets with aggregate stats', () => {
    const stats = buildHotVideoFilterStats([
      {
        video: {
          metrics: { views: 10_000, likes: 100 },
          score: {
            contribution: { grade: 'Good' },
            performance: { grade: 'Normal' },
          },
        },
        channel: { subscriberCount: 20_000 },
      },
      {
        video: {
          metrics: { views: 50_000, likes: 200 },
          score: {
            contribution: { grade: 'Normal' },
            performance: { grade: 'Good' },
          },
        },
        channel: { subscriberCount: 30_000 },
      },
    ] as never);

    expect(stats.views.buckets).toHaveLength(24);
    expect(stats.views.sum).toBe(60_000);
    expect(stats.views.average).toBe(30_000);
    expect(stats.views.median).toBe(30_000);
    expect(stats.views.sliderMax).toBeGreaterThanOrEqual(50_000);
    expect(stats.subscribers.buckets).toHaveLength(24);
    expect(stats.contributionGrades).toHaveLength(5);
  });

  it('builds monthly publish date buckets with placeholder bars when missing', () => {
    const empty = buildHotVideoFilterStats([] as never);
    expect(empty.publishedAt.hasData).toBe(false);
    expect(empty.publishedAt.buckets).toHaveLength(12);
    expect(empty.publishedAt.buckets.every((bucket) => bucket.count === 0)).toBe(true);

    const withDates = buildHotVideoFilterStats([
      {
        video: {
          publishedAt: '2026-03-15T00:00:00.000Z',
          metrics: { views: 1 },
          score: { contribution: { grade: 'Normal' }, performance: { grade: 'Normal' } },
        },
      },
      {
        video: {
          publishedAt: '2026-03-20T00:00:00.000Z',
          metrics: { views: 2 },
          score: { contribution: { grade: 'Good' }, performance: { grade: 'Good' } },
        },
      },
      {
        video: {
          publishedAt: '2026-04-01T00:00:00.000Z',
          metrics: { views: 3 },
          score: { contribution: { grade: 'Great' }, performance: { grade: 'Great' } },
        },
      },
    ] as never);

    expect(withDates.publishedAt.hasData).toBe(true);
    expect(withDates.publishedAt.buckets).toEqual([
      expect.objectContaining({ monthKey: '2026-03', count: 2, label: '3월' }),
      expect.objectContaining({ monthKey: '2026-04', count: 1, label: '4월' }),
    ]);
  });
});
