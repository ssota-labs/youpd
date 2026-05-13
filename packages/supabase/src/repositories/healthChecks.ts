import { eq } from 'drizzle-orm';
import { getDbClient, healthChecks, type HealthCheckRow } from '@youpd/db';

export async function getLivenessRow(): Promise<HealthCheckRow> {
  const db = getDbClient();
  const rows = await db
    .select()
    .from(healthChecks)
    .where(eq(healthChecks.key, 'liveness'))
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw new Error(
      "health_checks row with key='liveness' not found — run `pnpm db:reset` to apply migrations + seed",
    );
  }
  return row;
}
