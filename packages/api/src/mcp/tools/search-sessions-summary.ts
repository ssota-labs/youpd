import { z } from 'zod';
import {
  currentUsageDay,
  getRemainingUnits,
  summarizeSearchSessions,
  type SummaryRow,
} from '@youpd/supabase/repositories/quota';
import { getDailyLimit, runWithBudget } from '../quota';

const DateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const SearchSessionsSummaryInputSchema = z
  .object({
    from_date: DateOnly.optional(),
    to_date: DateOnly.optional(),
    group_by: z
      .enum(['operation', 'status', 'day', 'operation+status'])
      .default('operation+status'),
  })
  .strict();
export type SearchSessionsSummaryInput = z.infer<
  typeof SearchSessionsSummaryInputSchema
>;

export type SearchSessionsSummaryOutput = {
  rows: SummaryRow[];
  daily_remaining_units: number;
  query_window: { from: string; to: string };
  units_consumed: 0;
};

// Read-only aggregation over search_sessions. Server-wide (no per-user filter,
// ADR-012). PT-bucketed day window so the report aligns with the YouTube
// quota reset. Costs 0 YouTube units but still records one audit row so the
// summary call itself is visible in S4.
export async function searchSessionsSummary(
  input: SearchSessionsSummaryInput,
): Promise<SearchSessionsSummaryOutput> {
  const from = input.from_date ?? currentUsageDay();
  const to = input.to_date ?? from;

  const { result } = await runWithBudget<SearchSessionsSummaryOutput>({
    operation: 'sessions-summary',
    units: 0,
    call: async () => {
      const rows = await summarizeSearchSessions({
        from,
        to,
        groupBy: input.group_by,
      });
      const daily_remaining_units = await getRemainingUnits(getDailyLimit());
      const payload: SearchSessionsSummaryOutput = {
        rows,
        daily_remaining_units,
        query_window: { from, to },
        units_consumed: 0,
      };
      return { resultCount: rows.length, payload };
    },
  });

  return result;
}
