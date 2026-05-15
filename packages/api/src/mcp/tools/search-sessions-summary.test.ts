import { describe, expect, it, vi } from 'vitest';
import { searchSessionsSummary } from './search-sessions-summary';

const summarizeSearchSessions = vi.fn();
const getRemainingUnits = vi.fn();

vi.mock('@youpd/supabase/repositories/quota', () => ({
  summarizeSearchSessions: (...a: unknown[]) =>
    summarizeSearchSessions(...(a as [unknown])),
  getRemainingUnits: (...a: unknown[]) =>
    getRemainingUnits(...(a as [number, string | undefined])),
  currentUsageDay: () => '2026-06-01',
}));

vi.mock('../quota', () => ({
  attachQuotaSession: (result: unknown, sid: string | null) =>
    sid == null
      ? result
      : { ...(result as Record<string, unknown>), quota_session_id: sid },
  runWithBudget: async <T>(input: {
    operation: string;
    units: number;
    call: () => Promise<{ resultCount: number; payload: T }>;
  }) => {
    const { payload } = await input.call();
    return { result: payload, unitsConsumed: input.units, sessionId: null };
  },
  getDailyLimit: () => 9000,
  QuotaExceededAtBudgetError: class extends Error {},
}));

describe('searchSessionsSummary', () => {
  it('defaults from_date/to_date to today (PT) and group_by to operation+status', async () => {
    summarizeSearchSessions.mockResolvedValue([
      { group_key: 'hot-chart|success', call_count: 3, total_units: 3, success_rate: 1 },
    ]);
    getRemainingUnits.mockResolvedValue(8997);

    const out = await searchSessionsSummary({ group_by: 'operation+status' });

    expect(summarizeSearchSessions).toHaveBeenCalledWith({
      from: '2026-06-01',
      to: '2026-06-01',
      groupBy: 'operation+status',
    });
    expect(out.query_window).toEqual({ from: '2026-06-01', to: '2026-06-01' });
    expect(out.rows).toHaveLength(1);
    expect(out.daily_remaining_units).toBe(8997);
    expect(out.units_consumed).toBe(0);
  });

  it('passes explicit window + group_by through unchanged', async () => {
    summarizeSearchSessions.mockResolvedValue([]);
    getRemainingUnits.mockResolvedValue(9000);

    const out = await searchSessionsSummary({
      from_date: '2026-05-30',
      to_date: '2026-06-01',
      group_by: 'day',
    });

    expect(summarizeSearchSessions).toHaveBeenCalledWith({
      from: '2026-05-30',
      to: '2026-06-01',
      groupBy: 'day',
    });
    expect(out.rows).toEqual([]);
    expect(out.query_window).toEqual({ from: '2026-05-30', to: '2026-06-01' });
    expect(out.units_consumed).toBe(0);
  });
});
