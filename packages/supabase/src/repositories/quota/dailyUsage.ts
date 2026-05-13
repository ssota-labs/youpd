import { eq, sql } from 'drizzle-orm';
import {
  dailyQuotaUsage,
  getDbClient,
  type DailyQuotaUsageRow,
} from '@youpd/db';

// YouTube resets the daily quota at Pacific Time midnight. We bucket usage on
// the PT calendar date so the local counter matches the upstream window.
const PT_TZ = 'America/Los_Angeles';

export function currentUsageDay(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: PT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // en-CA renders YYYY-MM-DD which is what postgres date columns expect.
  return fmt.format(now);
}

export async function getDailyUsage(
  day: string = currentUsageDay(),
): Promise<DailyQuotaUsageRow | null> {
  const db = getDbClient();
  const rows = await db
    .select()
    .from(dailyQuotaUsage)
    .where(eq(dailyQuotaUsage.usageDay, day))
    .limit(1);
  return rows[0] ?? null;
}

export async function getRemainingUnits(
  limit: number,
  day: string = currentUsageDay(),
): Promise<number> {
  const row = await getDailyUsage(day);
  const used = row?.unitsConsumed ?? 0;
  return Math.max(0, limit - used);
}

// Atomically add `units` to today's counter. Concurrent calls race-stack into
// a single row via the unique primary key + ON CONFLICT. Returns the row's
// new total.
export async function incrementDailyUsage(
  units: number,
  day: string = currentUsageDay(),
): Promise<DailyQuotaUsageRow> {
  if (units < 0) throw new Error('units must be non-negative');
  const db = getDbClient();
  const [row] = await db
    .insert(dailyQuotaUsage)
    .values({ usageDay: day, unitsConsumed: units })
    .onConflictDoUpdate({
      target: dailyQuotaUsage.usageDay,
      set: {
        unitsConsumed: sql`${dailyQuotaUsage.unitsConsumed} + ${units}`,
        updatedAt: new Date(),
      },
    })
    .returning();
  if (!row) throw new Error('failed to upsert daily_quota_usage');
  return row;
}
