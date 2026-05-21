import {
  and,
  asc,
  eq,
  getDbClient,
  channels,
  videos,
  searchHarvests,
  searchHarvestVideos,
  searchHarvestChannels,
  sql,
  type SearchHarvestRow,
} from '@youpd/db';

export type CreateHarvestInput = {
  keywordIdeaPageId: string;
  keyword: string;
  searchSessionId: string | null;
  totalVideos: number;
  totalChannels: number;
};

/** Insert a new harvest row in `fetched` state. */
export async function createHarvest(
  input: CreateHarvestInput,
): Promise<SearchHarvestRow> {
  const db = getDbClient();
  const [row] = await db
    .insert(searchHarvests)
    .values({
      keywordIdeaPageId: input.keywordIdeaPageId,
      keyword: input.keyword,
      searchSessionId: input.searchSessionId,
      status: 'fetched',
      totalVideos: input.totalVideos,
      totalChannels: input.totalChannels,
    })
    .returning();
  if (!row) throw new Error('failed to insert search_harvests row');
  return row;
}

/**
 * Attach junction rows linking the harvest to canonical channels.
 *
 * Dedupes channel_ids defensively. The (harvest_id, channel_id) composite
 * primary key means even ON CONFLICT DO NOTHING cannot rescue a single
 * INSERT statement that proposes the same row twice — Postgres errors out
 * before the conflict path runs.
 */
export async function linkHarvestChannels(
  harvestId: string,
  channelIds: string[],
): Promise<void> {
  const unique = Array.from(new Set(channelIds));
  if (unique.length === 0) return;
  const db = getDbClient();
  await db
    .insert(searchHarvestChannels)
    .values(unique.map((channelId) => ({ harvestId, channelId })))
    .onConflictDoNothing();
}

/**
 * Attach junction rows linking the harvest to canonical videos, with rank.
 * Dedupes by videoId (keeping the first occurrence's position) so duplicate
 * search.list rankings cannot break the INSERT.
 */
export async function linkHarvestVideos(
  harvestId: string,
  videoEntries: { videoId: string; position: number }[],
): Promise<void> {
  if (videoEntries.length === 0) return;
  const seen = new Set<string>();
  const unique = videoEntries.filter((e) => {
    if (seen.has(e.videoId)) return false;
    seen.add(e.videoId);
    return true;
  });
  if (unique.length === 0) return;
  const db = getDbClient();
  await db
    .insert(searchHarvestVideos)
    .values(unique.map((e) => ({ harvestId, ...e })))
    .onConflictDoNothing();
}

export type HarvestStatus = {
  id: string;
  keywordIdeaPageId: string;
  keyword: string;
  status: string;
  totalVideos: number;
  totalChannels: number;
  unpublishedVideos: number;
  unpublishedChannels: number;
  finalized: boolean;
  notionKeywordPageId: string | null;
  createdAt: Date;
  finishedAt: Date | null;
};

/** Single harvest row + counts of unpublished junctions. */
export async function getHarvestStatus(
  id: string,
): Promise<HarvestStatus | null> {
  const db = getDbClient();
  const [row] = await db
    .select()
    .from(searchHarvests)
    .where(eq(searchHarvests.id, id))
    .limit(1);
  if (!row) return null;
  const [videoCounts] = await db
    .select({
      pending: sql<number>`count(*) filter (where not ${searchHarvestVideos.notionRelationSynced})::int`,
    })
    .from(searchHarvestVideos)
    .where(eq(searchHarvestVideos.harvestId, id));
  const [channelCounts] = await db
    .select({
      pending: sql<number>`count(*) filter (where not ${searchHarvestChannels.notionRelationSynced})::int`,
    })
    .from(searchHarvestChannels)
    .where(eq(searchHarvestChannels.harvestId, id));
  return {
    id: row.id,
    keywordIdeaPageId: row.keywordIdeaPageId,
    keyword: row.keyword,
    status: row.status,
    totalVideos: row.totalVideos,
    totalChannels: row.totalChannels,
    unpublishedVideos: videoCounts?.pending ?? 0,
    unpublishedChannels: channelCounts?.pending ?? 0,
    finalized: row.finalized,
    notionKeywordPageId: row.notionKeywordPageId,
    createdAt: row.createdAt,
    finishedAt: row.finishedAt,
  };
}

export type HarvestVideoItem = {
  videoId: string;
  position: number;
  channelId: string;
  title: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  durationSec: number | null;
  publishedAt: Date | null;
  url: string | null;
  notionPageId: string | null;
};

export type HarvestChannelItem = {
  channelId: string;
  title: string | null;
  subscriberCount: number | null;
  viewCount: number | null;
  videoCount: number | null;
  publishedAt: Date | null;
  url: string | null;
  notionPageId: string | null;
};

/** Unpublished video junctions joined with the canonical video row. */
export async function listUnpublishedHarvestVideos(
  harvestId: string,
  size: number,
): Promise<HarvestVideoItem[]> {
  const db = getDbClient();
  const rows = await db
    .select({
      videoId: videos.videoId,
      position: searchHarvestVideos.position,
      channelId: videos.channelId,
      title: videos.title,
      views: videos.views,
      likes: videos.likes,
      comments: videos.comments,
      durationSec: videos.durationSec,
      publishedAt: videos.publishedAt,
      url: videos.url,
      notionPageId: videos.notionPageId,
    })
    .from(searchHarvestVideos)
    .innerJoin(videos, eq(videos.videoId, searchHarvestVideos.videoId))
    .where(
      and(
        eq(searchHarvestVideos.harvestId, harvestId),
        eq(searchHarvestVideos.notionRelationSynced, false),
      ),
    )
    .orderBy(asc(searchHarvestVideos.position))
    .limit(size);
  return rows;
}

/** Unpublished channel junctions joined with the canonical channel row. */
export async function listUnpublishedHarvestChannels(
  harvestId: string,
  size: number,
): Promise<HarvestChannelItem[]> {
  const db = getDbClient();
  const rows = await db
    .select({
      channelId: channels.channelId,
      title: channels.title,
      subscriberCount: channels.subscriberCount,
      viewCount: channels.viewCount,
      videoCount: channels.videoCount,
      publishedAt: channels.publishedAt,
      url: channels.url,
      notionPageId: channels.notionPageId,
    })
    .from(searchHarvestChannels)
    .innerJoin(channels, eq(channels.channelId, searchHarvestChannels.channelId))
    .where(
      and(
        eq(searchHarvestChannels.harvestId, harvestId),
        eq(searchHarvestChannels.notionRelationSynced, false),
      ),
    )
    .limit(size);
  return rows;
}

export type MarkPublishedInput = {
  kind: 'video' | 'channel';
  id: string;
  notionPageId: string;
};

/**
 * For each item: cache notion_page_id on the canonical row and flip the
 * harvest junction to `notion_relation_synced = true`. Runs inside a
 * single transaction so a partial failure cannot leave junctions
 * out-of-sync with canonical rows.
 */
export async function markHarvestItemsPublished(
  harvestId: string,
  items: MarkPublishedInput[],
): Promise<void> {
  if (items.length === 0) return;
  const db = getDbClient();
  await db.transaction(async (tx) => {
    for (const item of items) {
      if (item.kind === 'video') {
        await tx
          .update(videos)
          .set({ notionPageId: item.notionPageId, notionSyncedAt: new Date() })
          .where(eq(videos.videoId, item.id));
        await tx
          .update(searchHarvestVideos)
          .set({ notionRelationSynced: true })
          .where(
            and(
              eq(searchHarvestVideos.harvestId, harvestId),
              eq(searchHarvestVideos.videoId, item.id),
            ),
          );
      } else {
        await tx
          .update(channels)
          .set({ notionPageId: item.notionPageId, notionSyncedAt: new Date() })
          .where(eq(channels.channelId, item.id));
        await tx
          .update(searchHarvestChannels)
          .set({ notionRelationSynced: true })
          .where(
            and(
              eq(searchHarvestChannels.harvestId, harvestId),
              eq(searchHarvestChannels.channelId, item.id),
            ),
          );
      }
    }
  });
}

export type SyncedPageIds = {
  videoPageIds: string[];
  channelPageIds: string[];
};

/**
 * Collect every Notion page id that was synced as part of this harvest, so
 * the worker can merge them into the Keywords-DB relation properties.
 */
export async function listSyncedPageIds(
  harvestId: string,
): Promise<SyncedPageIds> {
  const db = getDbClient();
  const videoRows = await db
    .select({ notionPageId: videos.notionPageId })
    .from(searchHarvestVideos)
    .innerJoin(videos, eq(videos.videoId, searchHarvestVideos.videoId))
    .where(
      and(
        eq(searchHarvestVideos.harvestId, harvestId),
        eq(searchHarvestVideos.notionRelationSynced, true),
      ),
    );
  const channelRows = await db
    .select({ notionPageId: channels.notionPageId })
    .from(searchHarvestChannels)
    .innerJoin(channels, eq(channels.channelId, searchHarvestChannels.channelId))
    .where(
      and(
        eq(searchHarvestChannels.harvestId, harvestId),
        eq(searchHarvestChannels.notionRelationSynced, true),
      ),
    );
  return {
    videoPageIds: videoRows
      .map((r) => r.notionPageId)
      .filter((s): s is string => typeof s === 'string'),
    channelPageIds: channelRows
      .map((r) => r.notionPageId)
      .filter((s): s is string => typeof s === 'string'),
  };
}

/** Move harvest into `publishing` (idempotent). */
export async function setHarvestPublishing(harvestId: string): Promise<void> {
  const db = getDbClient();
  await db
    .update(searchHarvests)
    .set({ status: 'publishing' })
    .where(
      and(
        eq(searchHarvests.id, harvestId),
        eq(searchHarvests.status, 'fetched'),
      ),
    );
}

/**
 * Finalize: stamp the Notion Keywords page id and mark `published` +
 * `finalized = true`. Caller must have already merged Keywords-DB relations
 * in Notion before invoking this so the row reflects a fully-completed cycle.
 */
export async function finalizeHarvest(
  harvestId: string,
  notionKeywordPageId: string,
): Promise<void> {
  const db = getDbClient();
  await db
    .update(searchHarvests)
    .set({
      status: 'published',
      finalized: true,
      notionKeywordPageId,
      finishedAt: new Date(),
    })
    .where(eq(searchHarvests.id, harvestId));
}

/** Single-row read used by `mark-published` / `finalize` validation. */
export async function getHarvestRow(
  id: string,
): Promise<SearchHarvestRow | null> {
  const db = getDbClient();
  const [row] = await db
    .select()
    .from(searchHarvests)
    .where(eq(searchHarvests.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * Most-recent non-finalized harvest for a Keyword Ideas row. Used by the
 * worker on session resume when it has lost the harvest id locally.
 */
export async function findActiveHarvest(
  keywordIdeaPageId: string,
): Promise<SearchHarvestRow | null> {
  const db = getDbClient();
  const [row] = await db
    .select()
    .from(searchHarvests)
    .where(
      and(
        eq(searchHarvests.keywordIdeaPageId, keywordIdeaPageId),
        eq(searchHarvests.finalized, false),
      ),
    )
    .orderBy(asc(searchHarvests.createdAt))
    .limit(1);
  return row ?? null;
}

