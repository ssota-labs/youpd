import { and, desc, eq } from 'drizzle-orm';
import {
  referenceFolderSocialPosts,
  socialPostMetricSnapshots,
  socialPostScores,
  socialPosts,
  socialSources,
} from '@youpd/db/schema';
import type {
  SocialPostLineage,
  SocialPostMetrics,
  SocialProvider,
} from '@youpd/types';
import { getDbClient } from '@youpd/db';

const ALL_PROVIDERS: SocialProvider[] = ['manual', 'threads', 'x_bookmarks'];

export async function ensureSocialSourcesForUser(userId: string) {
  const db = getDbClient();
  const existing = await db
    .select()
    .from(socialSources)
    .where(eq(socialSources.userId, userId));

  const byProvider = new Map(existing.map((row) => [row.provider, row]));
  const toInsert = ALL_PROVIDERS.filter((provider) => !byProvider.has(provider)).map(
    (provider) => ({
      userId,
      provider,
      connectionStatus:
        provider === 'manual'
          ? 'configured'
          : process.env.THREADS_CLIENT_ID || process.env.X_CLIENT_ID
            ? 'not_configured'
            : 'not_configured',
    }),
  );

  if (toInsert.length > 0) {
    await db.insert(socialSources).values(toInsert);
  }

  return db.select().from(socialSources).where(eq(socialSources.userId, userId));
}

export async function listSocialSources(userId: string) {
  return ensureSocialSourcesForUser(userId);
}

export async function getSocialSource(userId: string, provider: SocialProvider) {
  const rows = await ensureSocialSourcesForUser(userId);
  return rows.find((row) => row.provider === provider) ?? null;
}

export async function updateSocialSourceStatus(
  userId: string,
  provider: SocialProvider,
  patch: {
    connectionStatus: string;
    lastError?: string | null;
    lastSyncedAt?: Date | null;
  },
) {
  const db = getDbClient();
  const [row] = await db
    .update(socialSources)
    .set({
      connectionStatus: patch.connectionStatus,
      lastError: patch.lastError ?? null,
      lastSyncedAt: patch.lastSyncedAt ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(socialSources.userId, userId), eq(socialSources.provider, provider)))
    .returning();
  return row ?? null;
}

export async function getSocialPostById(userId: string, postId: string) {
  const db = getDbClient();
  const [row] = await db
    .select()
    .from(socialPosts)
    .where(and(eq(socialPosts.id, postId), eq(socialPosts.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function getSocialPostByPermalinkHash(
  userId: string,
  permalinkHash: string,
) {
  const db = getDbClient();
  const [row] = await db
    .select()
    .from(socialPosts)
    .where(
      and(eq(socialPosts.userId, userId), eq(socialPosts.permalinkHash, permalinkHash)),
    )
    .limit(1);
  return row ?? null;
}

export async function insertSocialPost(input: {
  userId: string;
  provider: string;
  externalId?: string | null;
  permalink: string;
  permalinkHash: string;
  authorHandle: string;
  authorDisplayName?: string | null;
  textContent: string;
  publishedAt?: Date | null;
  ingestMode: string;
  fetchStatus: string;
  rawPayloadJson?: unknown;
}) {
  const db = getDbClient();
  const [row] = await db
    .insert(socialPosts)
    .values({
      userId: input.userId,
      provider: input.provider,
      externalId: input.externalId ?? null,
      permalink: input.permalink,
      permalinkHash: input.permalinkHash,
      authorHandle: input.authorHandle,
      authorDisplayName: input.authorDisplayName ?? null,
      textContent: input.textContent,
      publishedAt: input.publishedAt ?? null,
      ingestMode: input.ingestMode,
      fetchStatus: input.fetchStatus,
      rawPayloadJson: input.rawPayloadJson ?? null,
      updatedAt: new Date(),
    })
    .returning();
  if (!row) throw new Error('failed to insert social_posts');
  return row;
}

export async function insertSocialMetricSnapshot(input: {
  postId: string;
  metrics: SocialPostMetrics;
  source: string;
}) {
  const db = getDbClient();
  const [row] = await db
    .insert(socialPostMetricSnapshots)
    .values({
      postId: input.postId,
      metricsJson: input.metrics,
      source: input.source,
    })
    .returning();
  if (!row) throw new Error('failed to insert social_post_metric_snapshots');
  return row;
}

export async function insertSocialPostScore(input: {
  postId: string;
  snapshotId: string;
  policyVersion: string;
  performanceGrade: string;
  engagementGrade: string;
  recencyGrade: string;
  rankScore: number | null;
  scoreBreakdownJson: Record<string, unknown>;
}) {
  const db = getDbClient();
  const [row] = await db
    .insert(socialPostScores)
    .values({
      postId: input.postId,
      snapshotId: input.snapshotId,
      policyVersion: input.policyVersion,
      performanceGrade: input.performanceGrade,
      engagementGrade: input.engagementGrade,
      recencyGrade: input.recencyGrade,
      rankScore: input.rankScore !== null ? String(input.rankScore) : null,
      scoreBreakdownJson: input.scoreBreakdownJson,
    })
    .returning();
  if (!row) throw new Error('failed to insert social_post_scores');
  return row;
}

export async function listSocialPosts(userId: string, limit = 50, offset = 0) {
  const db = getDbClient();
  return db
    .select()
    .from(socialPosts)
    .where(eq(socialPosts.userId, userId))
    .orderBy(desc(socialPosts.updatedAt))
    .limit(limit)
    .offset(offset);
}

export async function getLatestScoreForPost(postId: string) {
  const db = getDbClient();
  const [row] = await db
    .select()
    .from(socialPostScores)
    .where(eq(socialPostScores.postId, postId))
    .orderBy(desc(socialPostScores.computedAt))
    .limit(1);
  return row ?? null;
}

export async function listMetricSnapshotsForPost(postId: string) {
  const db = getDbClient();
  return db
    .select()
    .from(socialPostMetricSnapshots)
    .where(eq(socialPostMetricSnapshots.postId, postId))
    .orderBy(desc(socialPostMetricSnapshots.capturedAt));
}

export async function insertReferenceFolderSocialPost(input: {
  folderId: string;
  userId: string;
  socialPostId: string;
  lineage: SocialPostLineage;
  saveReason?: string | null;
}) {
  const db = getDbClient();
  const [row] = await db
    .insert(referenceFolderSocialPosts)
    .values({
      folderId: input.folderId,
      userId: input.userId,
      socialPostId: input.socialPostId,
      lineage: input.lineage,
      saveReason: input.saveReason ?? null,
    })
    .returning();
  if (!row) throw new Error('failed to insert reference_folder_social_posts');
  return row;
}

export async function listReferenceFolderSocialPosts(
  userId: string,
  folderId: string,
) {
  const db = getDbClient();
  return db
    .select({
      item: referenceFolderSocialPosts,
      post: socialPosts,
    })
    .from(referenceFolderSocialPosts)
    .innerJoin(socialPosts, eq(referenceFolderSocialPosts.socialPostId, socialPosts.id))
    .where(
      and(
        eq(referenceFolderSocialPosts.folderId, folderId),
        eq(referenceFolderSocialPosts.userId, userId),
      ),
    )
    .orderBy(desc(referenceFolderSocialPosts.createdAt));
}

export async function deleteReferenceFolderSocialPost(
  userId: string,
  folderId: string,
  itemId: string,
) {
  const db = getDbClient();
  const [row] = await db
    .delete(referenceFolderSocialPosts)
    .where(
      and(
        eq(referenceFolderSocialPosts.id, itemId),
        eq(referenceFolderSocialPosts.folderId, folderId),
        eq(referenceFolderSocialPosts.userId, userId),
      ),
    )
    .returning();
  return row ?? null;
}
