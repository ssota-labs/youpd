import { and, asc, eq, sql } from 'drizzle-orm';
import {
  dailyQuotaUsage,
  getDbClient,
  youtubeApiKeys,
  youtubeApiKeyDailyUsage,
  type YoutubeApiKeyRow,
} from '@youpd/db';

export type YoutubeApiKeyWithUsage = {
  id: string;
  label: string;
  key: string;
  status: string;
  unitsConsumedToday: number;
  lastUsedAt: Date | null;
};

export type SeedKeyResult =
  | { kind: 'seeded'; id: string; label: string }
  | { kind: 'skipped'; reason: 'pool_not_empty' | 'no_env_key' };

/**
 * Return all active keys joined with today's per-key usage. Caller computes
 * remaining-quota and picks the most idle / least-used key.
 */
export async function listActiveKeysWithUsage(
  today: string,
): Promise<YoutubeApiKeyWithUsage[]> {
  const db = getDbClient();
  const rows = await db
    .select({
      id: youtubeApiKeys.id,
      label: youtubeApiKeys.label,
      key: youtubeApiKeys.key,
      status: youtubeApiKeys.status,
      lastUsedAt: youtubeApiKeys.lastUsedAt,
      unitsConsumedToday: youtubeApiKeyDailyUsage.unitsConsumed,
    })
    .from(youtubeApiKeys)
    .leftJoin(
      youtubeApiKeyDailyUsage,
      and(
        eq(youtubeApiKeyDailyUsage.keyId, youtubeApiKeys.id),
        eq(youtubeApiKeyDailyUsage.usageDay, today),
      ),
    )
    .where(eq(youtubeApiKeys.status, 'active'))
    .orderBy(asc(youtubeApiKeys.lastUsedAt));
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    key: r.key,
    status: r.status,
    unitsConsumedToday: r.unitsConsumedToday ?? 0,
    lastUsedAt: r.lastUsedAt ?? null,
  }));
}

export async function markKeyExhausted(
  keyId: string,
  reason: string,
): Promise<void> {
  const db = getDbClient();
  await db
    .update(youtubeApiKeys)
    .set({
      status: 'exhausted',
      disabledReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(youtubeApiKeys.id, keyId));
}

export async function markKeyDisabled(
  keyId: string,
  reason: string,
): Promise<void> {
  const db = getDbClient();
  await db
    .update(youtubeApiKeys)
    .set({
      status: 'disabled',
      disabledReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(youtubeApiKeys.id, keyId));
}

/**
 * Record `units` against the given key for today, mirror to the global
 * dailyQuotaUsage counter, and bump last_used_at. The two upserts run in a
 * single transaction so a partial failure does not desync the counters.
 */
export async function recordKeyUsage(
  keyId: string,
  today: string,
  units: number,
): Promise<void> {
  if (units <= 0) return;
  const db = getDbClient();
  await db.transaction(async (tx) => {
    await tx
      .insert(youtubeApiKeyDailyUsage)
      .values({ keyId, usageDay: today, unitsConsumed: units })
      .onConflictDoUpdate({
        target: [
          youtubeApiKeyDailyUsage.keyId,
          youtubeApiKeyDailyUsage.usageDay,
        ],
        set: {
          unitsConsumed: sql`${youtubeApiKeyDailyUsage.unitsConsumed} + ${units}`,
          updatedAt: new Date(),
        },
      });
    await tx
      .insert(dailyQuotaUsage)
      .values({ usageDay: today, unitsConsumed: units })
      .onConflictDoUpdate({
        target: dailyQuotaUsage.usageDay,
        set: {
          unitsConsumed: sql`${dailyQuotaUsage.unitsConsumed} + ${units}`,
          updatedAt: new Date(),
        },
      });
    await tx
      .update(youtubeApiKeys)
      .set({ lastUsedAt: new Date(), updatedAt: new Date() })
      .where(eq(youtubeApiKeys.id, keyId));
  });
}

/** Idempotent: only seeds when the pool is empty. */
export async function seedKeyFromEnv(
  envKey: string,
  label = 'seeded-from-env',
): Promise<SeedKeyResult> {
  if (!envKey.trim()) return { kind: 'skipped', reason: 'no_env_key' };
  const db = getDbClient();
  const existing = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(youtubeApiKeys);
  const count = existing[0]?.count ?? 0;
  if (count > 0) return { kind: 'skipped', reason: 'pool_not_empty' };
  const [row] = await db
    .insert(youtubeApiKeys)
    .values({ label, key: envKey.trim() })
    .onConflictDoNothing()
    .returning();
  if (!row) {
    // Label already taken by a non-seeded row — treat as already-present.
    return { kind: 'skipped', reason: 'pool_not_empty' };
  }
  return { kind: 'seeded', id: row.id, label: row.label };
}

export async function insertKey(
  label: string,
  keyValue: string,
): Promise<YoutubeApiKeyRow> {
  const db = getDbClient();
  const [row] = await db
    .insert(youtubeApiKeys)
    .values({ label, key: keyValue })
    .returning();
  if (!row) throw new Error('failed to insert youtube_api_keys row');
  return row;
}

export async function countKeys(): Promise<number> {
  const db = getDbClient();
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(youtubeApiKeys);
  return rows[0]?.count ?? 0;
}
