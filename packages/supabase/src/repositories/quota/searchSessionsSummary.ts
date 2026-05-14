import { sql } from 'drizzle-orm';
import { getDbClient } from '@youpd/db';

// Server-wide aggregation over search_sessions (ADR-012 — no per-user filter).
// PT-bucketed days match the YouTube quota window (see currentUsageDay).
const PT_TZ = 'America/Los_Angeles';

export type SummaryGroupBy =
  | 'operation'
  | 'status'
  | 'day'
  | 'operation+status';

export type SummaryRow = {
  group_key: string;
  call_count: number;
  total_units: number;
  success_rate: number;
};

export type SummarizeInput = {
  from: string; // YYYY-MM-DD (PT calendar)
  to: string; // YYYY-MM-DD inclusive (PT calendar)
  groupBy: SummaryGroupBy;
};

// Build the SELECT-list group_key expression. Single source so the query and
// any future view definition stay aligned with the four allowed group_by modes.
function groupKeyExpr(groupBy: SummaryGroupBy) {
  switch (groupBy) {
    case 'operation':
      return sql`operation`;
    case 'status':
      return sql`status`;
    case 'day':
      return sql`(date_trunc('day', occurred_at at time zone ${PT_TZ})::date)::text`;
    case 'operation+status':
      return sql`operation || '|' || status`;
  }
}

export async function summarizeSearchSessions(
  input: SummarizeInput,
): Promise<SummaryRow[]> {
  const db = getDbClient();
  const key = groupKeyExpr(input.groupBy);

  // Bounds are half-open on the upper side: `to` is an inclusive PT-calendar
  // day, so we add a day for the upper bound. Cast to date in PT before the
  // comparison so a session at 23:59 PT on `to` is included.
  // drizzle-orm/postgres-js returns the rows array directly (with metadata
  // props like count/command attached); not the { rows } shape that pg uses.
  const result = (await db.execute(sql`
    select
      ${key} as group_key,
      count(*)::int as call_count,
      coalesce(sum(units_consumed), 0)::int as total_units,
      (count(*) filter (where status = 'success'))::float
        / nullif(count(*), 0) as success_rate
    from public.search_sessions
    where (occurred_at at time zone ${PT_TZ})::date >= ${input.from}::date
      and (occurred_at at time zone ${PT_TZ})::date <= ${input.to}::date
    group by ${key}
    order by group_key asc
  `)) as unknown as Array<{
    group_key: string;
    call_count: number;
    total_units: number;
    success_rate: number | null;
  }>;

  return result.map((r) => ({
    group_key: r.group_key,
    call_count: r.call_count,
    total_units: r.total_units,
    success_rate: r.success_rate ?? 0,
  }));
}
