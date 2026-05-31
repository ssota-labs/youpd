import { and, desc, eq, inArray } from 'drizzle-orm';
import {
  generatedAssets,
  thumbnailGenerationDrafts,
  thumbnailGenerationJobs,
} from '@youpd/db/schema';
import { getDbClient } from '@youpd/db';

export async function getThumbnailDraftForUser(input: {
  userId: string;
  templateId: string;
}) {
  const db = getDbClient();
  const [row] = await db
    .select()
    .from(thumbnailGenerationDrafts)
    .where(
      and(
        eq(thumbnailGenerationDrafts.userId, input.userId),
        eq(thumbnailGenerationDrafts.templateId, input.templateId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function upsertThumbnailDraft(input: {
  userId: string;
  templateId: string;
  templateVersion: string;
  slotValuesJson: unknown;
  selectedReferenceVideoIds: unknown;
}) {
  const db = getDbClient();
  const now = new Date();
  const [row] = await db
    .insert(thumbnailGenerationDrafts)
    .values({
      userId: input.userId,
      templateId: input.templateId,
      templateVersion: input.templateVersion,
      slotValuesJson: input.slotValuesJson,
      selectedReferenceVideoIds: input.selectedReferenceVideoIds,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        thumbnailGenerationDrafts.userId,
        thumbnailGenerationDrafts.templateId,
      ],
      set: {
        templateVersion: input.templateVersion,
        slotValuesJson: input.slotValuesJson,
        selectedReferenceVideoIds: input.selectedReferenceVideoIds,
        updatedAt: now,
      },
    })
    .returning();
  return row;
}

export async function insertThumbnailGenerationJob(input: {
  userId: string;
  templateId: string;
  draftId: string | null;
  status: string;
  providerKey: string;
  promptText: string;
  promptVersion: string;
  slotValuesJson: unknown;
  referenceContextJson: unknown;
  startedAt?: Date;
  finishedAt?: Date;
  errorCode?: string | null;
  errorMessage?: string | null;
}) {
  const db = getDbClient();
  const [row] = await db
    .insert(thumbnailGenerationJobs)
    .values({
      userId: input.userId,
      templateId: input.templateId,
      draftId: input.draftId,
      status: input.status,
      providerKey: input.providerKey,
      promptText: input.promptText,
      promptVersion: input.promptVersion,
      slotValuesJson: input.slotValuesJson,
      referenceContextJson: input.referenceContextJson,
      startedAt: input.startedAt ?? null,
      finishedAt: input.finishedAt ?? null,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
    })
    .returning();
  return row;
}

export async function updateThumbnailGenerationJob(input: {
  jobId: string;
  userId: string;
  status: string;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}) {
  const db = getDbClient();
  const [row] = await db
    .update(thumbnailGenerationJobs)
    .set({
      status: input.status,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt,
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
    })
    .where(
      and(
        eq(thumbnailGenerationJobs.id, input.jobId),
        eq(thumbnailGenerationJobs.userId, input.userId),
      ),
    )
    .returning();
  return row ?? null;
}

export async function getThumbnailGenerationJobForUser(input: {
  jobId: string;
  userId: string;
}) {
  const db = getDbClient();
  const [row] = await db
    .select()
    .from(thumbnailGenerationJobs)
    .where(
      and(
        eq(thumbnailGenerationJobs.id, input.jobId),
        eq(thumbnailGenerationJobs.userId, input.userId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listThumbnailGenerationJobsForUser(input: {
  userId: string;
  limit?: number;
}) {
  const db = getDbClient();
  const limit = input.limit ?? 20;
  return db
    .select()
    .from(thumbnailGenerationJobs)
    .where(eq(thumbnailGenerationJobs.userId, input.userId))
    .orderBy(desc(thumbnailGenerationJobs.createdAt))
    .limit(limit);
}

export async function insertGeneratedAsset(input: {
  userId: string;
  jobId: string;
  templateId: string;
  storageBucket: string;
  storagePath: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  lineageJson: unknown;
}) {
  const db = getDbClient();
  const [row] = await db
    .insert(generatedAssets)
    .values({
      userId: input.userId,
      jobId: input.jobId,
      templateId: input.templateId,
      storageBucket: input.storageBucket,
      storagePath: input.storagePath,
      mimeType: input.mimeType,
      width: input.width,
      height: input.height,
      lineageJson: input.lineageJson,
    })
    .returning();
  return row;
}

export async function listGeneratedAssetsForJob(input: {
  jobId: string;
  userId: string;
}) {
  const db = getDbClient();
  return db
    .select()
    .from(generatedAssets)
    .where(
      and(
        eq(generatedAssets.jobId, input.jobId),
        eq(generatedAssets.userId, input.userId),
      ),
    )
    .orderBy(desc(generatedAssets.createdAt));
}

export async function countGeneratedAssetsForJobs(input: {
  jobIds: string[];
  userId: string;
}) {
  if (input.jobIds.length === 0) return new Map<string, number>();
  const db = getDbClient();
  const rows = await db
    .select({
      jobId: generatedAssets.jobId,
    })
    .from(generatedAssets)
    .where(
      and(
        eq(generatedAssets.userId, input.userId),
        inArray(generatedAssets.jobId, input.jobIds),
      ),
    );
  const counts = new Map<string, number>();
  for (const id of input.jobIds) {
    counts.set(id, 0);
  }
  for (const row of rows) {
    counts.set(row.jobId, (counts.get(row.jobId) ?? 0) + 1);
  }
  return counts;
}
