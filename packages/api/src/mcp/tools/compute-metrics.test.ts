import { describe, expect, it, vi } from 'vitest';
import { computeMetrics } from './compute-metrics';

vi.mock('../quota', () => ({
  attachQuotaSession: (result: unknown, sid: string | null) =>
    sid == null
      ? result
      : { ...(result as Record<string, unknown>), quota_session_id: sid },
  runWithBudget: async <T>(input: {
    units: number;
    call: () => Promise<{ resultCount: number; payload: T }>;
  }) => {
    const { payload } = await input.call();
    return { result: payload, unitsConsumed: input.units, sessionId: null };
  },
  QuotaExceededAtBudgetError: class extends Error {},
}));

function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 3600 * 1000).toISOString().slice(0, 10);
}

describe('computeMetrics', () => {
  it('computes contribution and performance', async () => {
    const out = await computeMetrics({
      latest_views: 1000,
      channel_avg_views: 200,
      channel_subs: 500,
      snapshots: [],
    });
    expect(out.contribution).toBe(5);
    expect(out.performance).toBe(2);
    expect(out.exposure_probability).toBeNull();
    expect(out.units_consumed).toBe(0);
  });

  it('returns null when divisors are zero or null', async () => {
    const out = await computeMetrics({
      latest_views: 100,
      channel_avg_views: 0,
      channel_subs: null,
      snapshots: [],
    });
    expect(out.contribution).toBeNull();
    expect(out.performance).toBeNull();
  });

  it('exposure_probability uses (7d/7) / (30d/30) — value > 1 means heating up', async () => {
    // 30d window grows by 300 total = 10/day; 7d window grows by 140 = 20/day.
    // exposure = 20 / 10 = 2.0
    const out = await computeMetrics({
      latest_views: 1000,
      channel_avg_views: 500,
      channel_subs: 1000,
      snapshots: [
        { snapshot_date: isoDaysAgo(29), views: 700 },
        { snapshot_date: isoDaysAgo(7), views: 860 },
        { snapshot_date: isoDaysAgo(0), views: 1000 },
      ],
    });
    expect(out.window_30d_delta).toBe(300);
    expect(out.window_7d_delta).toBe(140);
    expect(out.exposure_probability).toBeCloseTo(2, 5);
  });

  it('returns null exposure when fewer than 2 snapshots in window', async () => {
    const out = await computeMetrics({
      latest_views: 1000,
      channel_avg_views: 500,
      channel_subs: 1000,
      snapshots: [{ snapshot_date: isoDaysAgo(0), views: 1000 }],
    });
    expect(out.exposure_probability).toBeNull();
    expect(out.snapshots_used).toBe(1);
  });
});
