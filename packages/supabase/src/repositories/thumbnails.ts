import { and, asc, desc, eq, getDbClient, sql } from '@youpd/db';
import { thumbnails, type ThumbnailRow } from '@youpd/db';
import type { Aspect, ThumbnailDocument } from '@youpd/types';

export class ThumbnailNotFoundError extends Error {
  override readonly name = 'ThumbnailNotFoundError';
  constructor(public readonly id: string) {
    super(`thumbnail ${id} not found`);
  }
}

export class ThumbnailVersionConflictError extends Error {
  override readonly name = 'ThumbnailVersionConflictError';
  constructor(
    public readonly id: string,
    public readonly currentVersion: number,
    public readonly providedVersion: number,
  ) {
    super(
      `thumbnail ${id} version conflict: current=${currentVersion} provided=${providedVersion}`,
    );
  }
}

export type CreateThumbnailInput = {
  orgId: string;
  notionCandidateUrl?: string | null;
  channelId?: string | null;
  name?: string | null;
  aspect: Aspect;
  document: ThumbnailDocument;
  updatedBy?: string | null;
};

export async function createThumbnail(
  input: CreateThumbnailInput,
): Promise<ThumbnailRow> {
  const db = getDbClient();
  const [row] = await db
    .insert(thumbnails)
    .values({
      orgId: input.orgId,
      notionCandidateUrl: input.notionCandidateUrl ?? null,
      channelId: input.channelId ?? null,
      name: input.name ?? null,
      aspect: input.aspect,
      background: input.document.background ?? null,
      layers: input.document.layers,
      version: 1,
      updatedBy: input.updatedBy ?? null,
    })
    .returning();
  if (!row) throw new Error('failed to insert thumbnail');
  return row;
}

export async function getThumbnail(id: string): Promise<ThumbnailRow> {
  const db = getDbClient();
  const rows = await db
    .select()
    .from(thumbnails)
    .where(eq(thumbnails.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) throw new ThumbnailNotFoundError(id);
  return row;
}

export async function listThumbnailsByCandidate(
  orgId: string,
  notionCandidateUrl: string,
): Promise<ThumbnailRow[]> {
  const db = getDbClient();
  return db
    .select()
    .from(thumbnails)
    .where(
      and(
        eq(thumbnails.orgId, orgId),
        eq(thumbnails.notionCandidateUrl, notionCandidateUrl),
      ),
    )
    .orderBy(desc(thumbnails.updatedAt));
}

export type UpdateLayersInput = {
  id: string;
  expectedVersion: number;
  layers: unknown;
  background?: unknown;
  updatedBy?: string | null;
};

// Optimistic update: only writes if `expected_version` matches DB. Returns the
// new row, or throws VersionConflictError when stale.
export async function updateThumbnailLayers(
  input: UpdateLayersInput,
): Promise<ThumbnailRow> {
  const db = getDbClient();
  const [row] = await db
    .update(thumbnails)
    .set({
      layers: input.layers as never,
      ...(input.background !== undefined
        ? { background: input.background as never }
        : {}),
      version: sql`${thumbnails.version} + 1`,
      updatedAt: new Date(),
      updatedBy: input.updatedBy ?? null,
    })
    .where(
      and(
        eq(thumbnails.id, input.id),
        eq(thumbnails.version, input.expectedVersion),
      ),
    )
    .returning();
  if (!row) {
    const current = await getThumbnail(input.id);
    throw new ThumbnailVersionConflictError(
      input.id,
      current.version,
      input.expectedVersion,
    );
  }
  return row;
}

export type SetExportUrlsInput = {
  id: string;
  exportPngUrl?: string | null;
  exportShortPngUrl?: string | null;
};

export async function setThumbnailExportUrls(
  input: SetExportUrlsInput,
): Promise<ThumbnailRow> {
  const db = getDbClient();
  const [row] = await db
    .update(thumbnails)
    .set({
      ...(input.exportPngUrl !== undefined
        ? { exportPngUrl: input.exportPngUrl }
        : {}),
      ...(input.exportShortPngUrl !== undefined
        ? { exportShortPngUrl: input.exportShortPngUrl }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(thumbnails.id, input.id))
    .returning();
  if (!row) throw new ThumbnailNotFoundError(input.id);
  return row;
}

// Convenience helper for tests / dev seed — lists most-recent thumbnails for
// an org with no candidate filter.
export async function listRecentThumbnailsForOrg(
  orgId: string,
  limit = 50,
): Promise<ThumbnailRow[]> {
  const db = getDbClient();
  return db
    .select()
    .from(thumbnails)
    .where(eq(thumbnails.orgId, orgId))
    .orderBy(asc(thumbnails.updatedAt))
    .limit(limit);
}
