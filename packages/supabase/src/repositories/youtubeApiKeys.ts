import { createHash } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import {
  getDbClient,
  youtubeApiKeys,
  type YouTubeApiKeyRow,
} from '@youpd/db';

export type YouTubeApiKeyStatus = 'active' | 'quota_exhausted' | 'disabled';

export type UpsertYouTubeApiKeyInput = {
  name: string;
  keyValue: string;
};

export type ActiveYouTubeApiKey = Pick<
  YouTubeApiKeyRow,
  'id' | 'name' | 'keyValue'
>;

function hashKey(keyValue: string): string {
  return createHash('sha256').update(keyValue).digest('hex');
}

export async function upsertYouTubeApiKeys(
  keys: UpsertYouTubeApiKeyInput[],
): Promise<YouTubeApiKeyRow[]> {
  const values = keys
    .map((key) => ({
      name: key.name.trim(),
      keyValue: key.keyValue.trim(),
    }))
    .filter((key) => key.name.length > 0 && key.keyValue.length > 0)
    .map((key) => ({
      ...key,
      keyHash: hashKey(key.keyValue),
      status: 'active' as YouTubeApiKeyStatus,
      quotaExhaustedAt: null,
      updatedAt: new Date(),
    }));

  if (values.length === 0) return [];

  const db = getDbClient();
  return db
    .insert(youtubeApiKeys)
    .values(values)
    .onConflictDoUpdate({
      target: youtubeApiKeys.name,
      set: {
        keyHash: sql`excluded.key_hash`,
        keyValue: sql`excluded.key_value`,
        status: 'active',
        quotaExhaustedAt: null,
        updatedAt: new Date(),
      },
    })
    .returning();
}

export async function getActiveYouTubeApiKey(): Promise<
  ActiveYouTubeApiKey | undefined
> {
  const db = getDbClient();
  const rows = await db
    .select({
      id: youtubeApiKeys.id,
      name: youtubeApiKeys.name,
      keyValue: youtubeApiKeys.keyValue,
    })
    .from(youtubeApiKeys)
    .where(eq(youtubeApiKeys.status, 'active'))
    .orderBy(sql`${youtubeApiKeys.lastUsedAt} asc nulls first`)
    .limit(1);

  return rows[0];
}

export async function markYouTubeApiKeyUsed(id: string): Promise<void> {
  const db = getDbClient();
  await db
    .update(youtubeApiKeys)
    .set({
      lastUsedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(youtubeApiKeys.id, id));
}

export async function markYouTubeApiKeyQuotaExhausted(
  id: string,
): Promise<void> {
  const db = getDbClient();
  await db
    .update(youtubeApiKeys)
    .set({
      status: 'quota_exhausted',
      quotaExhaustedAt: new Date(),
      failureCount: sql`${youtubeApiKeys.failureCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(youtubeApiKeys.id, id));
}
