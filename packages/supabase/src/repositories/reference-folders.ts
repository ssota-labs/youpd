import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import {
  referenceFolderGroups,
  referenceFolderVideos,
  referenceFolders,
  youtubeChannels,
  youtubeVideos,
} from '@youpd/db/schema';
import { getDbClient } from '@youpd/db';
import type { ReferenceVideoLineage } from '@youpd/types';

export async function listReferenceFolderGroups(userId: string) {
  const db = getDbClient();
  const groups = await db
    .select()
    .from(referenceFolderGroups)
    .where(eq(referenceFolderGroups.userId, userId))
    .orderBy(desc(referenceFolderGroups.updatedAt));

  if (groups.length === 0) return [];

  const folderCounts = await db
    .select({
      groupId: referenceFolders.groupId,
      folderCount: count(),
    })
    .from(referenceFolders)
    .where(eq(referenceFolders.userId, userId))
    .groupBy(referenceFolders.groupId);

  const videoCounts = await db
    .select({
      groupId: referenceFolders.groupId,
      videoCount: count(referenceFolderVideos.id),
    })
    .from(referenceFolderVideos)
    .innerJoin(referenceFolders, eq(referenceFolderVideos.folderId, referenceFolders.id))
    .where(eq(referenceFolderVideos.userId, userId))
    .groupBy(referenceFolders.groupId);

  const folderCountByGroup = new Map(
    folderCounts.map((row) => [row.groupId, Number(row.folderCount)]),
  );
  const videoCountByGroup = new Map(
    videoCounts.map((row) => [row.groupId, Number(row.videoCount)]),
  );

  return groups.map((group) => ({
    group,
    folderCount: folderCountByGroup.get(group.id) ?? 0,
    videoCount: videoCountByGroup.get(group.id) ?? 0,
  }));
}

export async function getReferenceFolderGroup(userId: string, groupId: string) {
  const db = getDbClient();
  const [group] = await db
    .select()
    .from(referenceFolderGroups)
    .where(
      and(eq(referenceFolderGroups.id, groupId), eq(referenceFolderGroups.userId, userId)),
    )
    .limit(1);
  if (!group) return null;

  const folders = await db
    .select({
      folder: referenceFolders,
      videoCount: count(referenceFolderVideos.id),
    })
    .from(referenceFolders)
    .leftJoin(
      referenceFolderVideos,
      eq(referenceFolderVideos.folderId, referenceFolders.id),
    )
    .where(
      and(eq(referenceFolders.groupId, groupId), eq(referenceFolders.userId, userId)),
    )
    .groupBy(referenceFolders.id)
    .orderBy(asc(referenceFolders.sortOrder), asc(referenceFolders.name));

  return { group, folders };
}

export async function createReferenceFolderGroup(input: {
  userId: string;
  title: string;
  audience: string;
  seedTheme: string;
  intentSummary: string;
  originUserProbeId?: string | null;
  profileSnapshot?: unknown;
}) {
  const db = getDbClient();
  const [row] = await db
    .insert(referenceFolderGroups)
    .values({
      userId: input.userId,
      title: input.title,
      audience: input.audience,
      seedTheme: input.seedTheme,
      intentSummary: input.intentSummary,
      originUserProbeId: input.originUserProbeId ?? null,
      profileSnapshot: input.profileSnapshot ?? null,
      updatedAt: new Date(),
    })
    .returning();
  if (!row) throw new Error('failed to create reference_folder_groups');
  return row;
}

export async function insertReferenceFolders(
  rows: Array<{
    groupId: string;
    userId: string;
    name: string;
    consumerStage: string | null;
    sortOrder: number;
    isStageTemplate: boolean;
    isUnspecified: boolean;
  }>,
) {
  if (rows.length === 0) return [];
  const db = getDbClient();
  return db.insert(referenceFolders).values(rows).returning();
}

export async function getReferenceFolder(userId: string, folderId: string) {
  const db = getDbClient();
  const [row] = await db
    .select()
    .from(referenceFolders)
    .where(
      and(eq(referenceFolders.id, folderId), eq(referenceFolders.userId, userId)),
    )
    .limit(1);
  return row ?? null;
}

export async function listReferenceFolderVideos(
  userId: string,
  folderId: string,
  limit = 100,
  offset = 0,
) {
  const db = getDbClient();
  return db
    .select({
      item: referenceFolderVideos,
      video: youtubeVideos,
      channelTitle: youtubeChannels.title,
    })
    .from(referenceFolderVideos)
    .innerJoin(youtubeVideos, eq(referenceFolderVideos.videoId, youtubeVideos.videoId))
    .leftJoin(youtubeChannels, eq(youtubeVideos.channelId, youtubeChannels.channelId))
    .where(
      and(
        eq(referenceFolderVideos.folderId, folderId),
        eq(referenceFolderVideos.userId, userId),
      ),
    )
    .orderBy(desc(referenceFolderVideos.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function insertReferenceFolderVideo(input: {
  folderId: string;
  userId: string;
  videoId: string;
  lineage: ReferenceVideoLineage;
  saveReason?: string | null;
}) {
  const db = getDbClient();
  const [row] = await db
    .insert(referenceFolderVideos)
    .values({
      folderId: input.folderId,
      userId: input.userId,
      videoId: input.videoId,
      lineage: input.lineage,
      saveReason: input.saveReason ?? null,
    })
    .returning();
  if (!row) throw new Error('failed to insert reference_folder_videos');
  return row;
}

export async function deleteReferenceFolderVideo(
  userId: string,
  folderId: string,
  itemId: string,
) {
  const db = getDbClient();
  const [row] = await db
    .delete(referenceFolderVideos)
    .where(
      and(
        eq(referenceFolderVideos.id, itemId),
        eq(referenceFolderVideos.folderId, folderId),
        eq(referenceFolderVideos.userId, userId),
      ),
    )
    .returning();
  return row ?? null;
}

export async function touchReferenceGroupUpdatedAt(groupId: string) {
  const db = getDbClient();
  await db
    .update(referenceFolderGroups)
    .set({ updatedAt: new Date() })
    .where(eq(referenceFolderGroups.id, groupId));
}

export async function listReferenceFoldersPicker(userId: string) {
  const db = getDbClient();
  return db
    .select({
      folderId: referenceFolders.id,
      folderName: referenceFolders.name,
      groupId: referenceFolderGroups.id,
      groupTitle: referenceFolderGroups.title,
      consumerStage: referenceFolders.consumerStage,
    })
    .from(referenceFolders)
    .innerJoin(referenceFolderGroups, eq(referenceFolders.groupId, referenceFolderGroups.id))
    .where(eq(referenceFolders.userId, userId))
    .orderBy(desc(referenceFolderGroups.updatedAt), asc(referenceFolders.sortOrder));
}

export async function ensureYoutubeVideoExists(videoId: string, title: string) {
  const db = getDbClient();
  await db
    .insert(youtubeVideos)
    .values({
      videoId,
      title,
      collectedAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: youtubeVideos.videoId,
      set: {
        title: sql`excluded.title`,
        updatedAt: new Date(),
      },
    });
}
