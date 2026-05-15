import { and, asc, desc, eq, getDbClient, gt, sql } from '@youpd/db';
import { thumbnails, thumbnailVersions, type ThumbnailRow } from '@youpd/db';
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
      kind: 'thumbnail',
      notionCandidateUrl: input.notionCandidateUrl ?? null,
      channelId: input.channelId ?? null,
      name: input.name ?? null,
      aspect: input.aspect,
      canvas: input.document.canvas as never,
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
//
// Side effects:
// - Snapshots the *previous* (pre-update) layers into thumbnail_versions so
//   undo can restore them.
// - If history_cursor > 0 (= user had undone N edits, then made a new edit),
//   prunes the "future" snapshots beyond the current version so redo no
//   longer reaches them.
// - Resets history_cursor to 0.
export async function updateThumbnailLayers(
  input: UpdateLayersInput,
): Promise<ThumbnailRow> {
  const db = getDbClient();
  // Read previous state for snapshot.
  const prev = await getThumbnail(input.id);
  if (prev.version !== input.expectedVersion) {
    throw new ThumbnailVersionConflictError(
      input.id,
      prev.version,
      input.expectedVersion,
    );
  }

  // Push prior layers into history.
  await db.insert(thumbnailVersions).values({
    documentId: prev.id,
    version: prev.version,
    layers: prev.layers as never,
    createdBy: input.updatedBy ?? null,
  });

  // If the user had undone (cursor > 0) and is now making a new edit, prune
  // future history beyond current version so redo can't replay stale snapshots.
  if (prev.historyCursor > 0) {
    await db
      .delete(thumbnailVersions)
      .where(
        and(
          eq(thumbnailVersions.documentId, prev.id),
          gt(thumbnailVersions.version, prev.version),
        ),
      );
  }

  const [row] = await db
    .update(thumbnails)
    .set({
      layers: input.layers as never,
      ...(input.background !== undefined
        ? { background: input.background as never }
        : {}),
      version: sql`${thumbnails.version} + 1`,
      historyCursor: 0,
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

export class HistoryBoundaryError extends Error {
  override readonly name = 'HistoryBoundaryError';
  constructor(public readonly direction: 'undo' | 'redo') {
    super(`no more history in direction: ${direction}`);
  }
}

// Linear undo/redo built on top of thumbnail_versions. Each user edit
// (set_layer / add_layer / delete / reorder) snapshots prev state at the
// then-current `version` value. Undo pops the most recent snapshot whose
// `version` is older than current; redo replays by re-using the snapshot
// pushed during undo at the older version. We track `historyCursor` so we
// know how many undo steps were applied (a non-zero cursor means there is
// a future to redo into).
export async function navigateHistory(
  id: string,
  direction: 'undo' | 'redo',
): Promise<ThumbnailRow> {
  const db = getDbClient();
  const current = await getThumbnail(id);

  if (direction === 'undo') {
    const [snap] = await db
      .select()
      .from(thumbnailVersions)
      .where(eq(thumbnailVersions.documentId, id))
      .orderBy(desc(thumbnailVersions.version))
      .limit(1);
    if (!snap || snap.version >= current.version) {
      throw new HistoryBoundaryError('undo');
    }
    // Snapshot current state at current.version BEFORE moving so redo can
    // bring it back. Insert with a higher version so descending order keeps
    // it on top of the redo stack.
    await db.insert(thumbnailVersions).values({
      documentId: id,
      version: current.version,
      layers: current.layers as never,
      createdBy: 'undo',
    });
    const [row] = await db
      .update(thumbnails)
      .set({
        layers: snap.layers as never,
        version: sql`${thumbnails.version} + 1`,
        historyCursor: sql`${thumbnails.historyCursor} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(thumbnails.id, id))
      .returning();
    if (!row) throw new ThumbnailNotFoundError(id);
    return row;
  }

  // Redo only valid if a prior undo created a "future" snapshot. We tracked
  // that via historyCursor.
  if (current.historyCursor <= 0) throw new HistoryBoundaryError('redo');
  // The redo snapshot is the most-recent version <= current.version that
  // was created with role='undo' or 'redo' (i.e. transactionally pushed
  // by a prior undo). We just pop the latest such row.
  const [snap] = await db
    .select()
    .from(thumbnailVersions)
    .where(eq(thumbnailVersions.documentId, id))
    .orderBy(desc(thumbnailVersions.version), desc(thumbnailVersions.createdAt))
    .limit(1);
  if (!snap) throw new HistoryBoundaryError('redo');
  const [row] = await db
    .update(thumbnails)
    .set({
      layers: snap.layers as never,
      version: sql`${thumbnails.version} + 1`,
      historyCursor: sql`${thumbnails.historyCursor} - 1`,
      updatedAt: new Date(),
    })
    .where(eq(thumbnails.id, id))
    .returning();
  if (!row) throw new ThumbnailNotFoundError(id);
  // Pop the snapshot we just consumed so subsequent redoes don't loop.
  await db
    .delete(thumbnailVersions)
    .where(eq(thumbnailVersions.id, snap.id));
  return row;
}

// Snapshot counts for UI gating.
export async function getHistoryCounts(
  id: string,
): Promise<{ canUndo: boolean; canRedo: boolean }> {
  const db = getDbClient();
  const current = await getThumbnail(id);
  const [pastCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(thumbnailVersions)
    .where(
      and(
        eq(thumbnailVersions.documentId, id),
        sql`${thumbnailVersions.version} < ${current.version}`,
      ),
    );
  return {
    canUndo: (pastCount?.n ?? 0) > 0,
    canRedo: current.historyCursor > 0,
  };
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
