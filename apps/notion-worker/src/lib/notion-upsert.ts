import type { Client } from '@notionhq/client';

import { CANONICAL } from './schema.js';
import type { DataSourceSchema } from './schema.js';

export type { DataSourceSchema };

export type DataSourcePropertyMeta = {
  id: string;
  name: string;
  type: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function requireProp(
  schema: DataSourceSchema,
  exactName: string,
): DataSourcePropertyMeta {
  const hit = Object.values(schema).find((p) => p.name === exactName);
  if (!hit) {
    throw new Error(`Missing Notion property "${exactName}".`);
  }
  return hit;
}

export function extractRichTextFromProperty(prop: unknown): string | null {
  if (!isRecord(prop) || prop.type !== 'rich_text') return null;
  const rt = prop.rich_text;
  if (!Array.isArray(rt)) return null;
  const text = rt
    .map((item: unknown) =>
      isRecord(item) && typeof item.plain_text === 'string'
        ? item.plain_text
        : '',
    )
    .join('')
    .trim();
  return text || null;
}

function isFullPage(result: unknown): result is { id: string } {
  return (
    typeof result === 'object' &&
    result !== null &&
    'object' in result &&
    (result as { object?: string }).object === 'page' &&
    typeof (result as { id?: unknown }).id === 'string'
  );
}

export async function findPageIdByRichTextEquals(
  notion: Client,
  dataSourceId: string,
  propertyName: string,
  equals: string,
): Promise<string | null> {
  const res = await notion.dataSources.query({
    data_source_id: dataSourceId,
    page_size: 1,
    filter: {
      property: propertyName,
      type: 'rich_text',
      rich_text: { equals },
    },
  });
  for (const r of res.results) {
    if (isFullPage(r)) return r.id;
  }
  return null;
}

/**
 * Batched lookup: resolve N rich_text values to page ids in a single
 * `data_sources.query` per chunk. Notion supports up to ~100 OR conditions
 * per filter; we cap each chunk at 50 to stay well under that and to keep
 * the response under the 100-row default page size.
 *
 * Returns a `Map<value, pageId>` keyed by the rich_text plain text of the
 * lookup property. Values not present in the data source are simply absent
 * from the map.
 */
export async function findPageIdsByRichTextIn(
  notion: Client,
  dataSourceId: string,
  propertyName: string,
  values: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = Array.from(new Set(values.filter((s) => s.length > 0)));
  if (unique.length === 0) return out;
  const CHUNK = 50;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const slice = unique.slice(i, i + CHUNK);
    const filter =
      slice.length === 1
        ? {
            property: propertyName,
            type: 'rich_text' as const,
            rich_text: { equals: slice[0]! },
          }
        : {
            or: slice.map((v) => ({
              property: propertyName,
              type: 'rich_text' as const,
              rich_text: { equals: v },
            })),
          };
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      filter,
    });
    for (const r of res.results) {
      if (!isFullPage(r)) continue;
      const props = (r as { properties?: Record<string, unknown> }).properties;
      if (!props) continue;
      const text = extractRichTextFromProperty(props[propertyName]);
      if (text && slice.includes(text)) out.set(text, r.id);
    }
  }
  return out;
}

export async function findPageIdByTitleEquals(
  notion: Client,
  dataSourceId: string,
  titlePropertyName: string,
  equals: string,
): Promise<string | null> {
  const res = await notion.dataSources.query({
    data_source_id: dataSourceId,
    page_size: 1,
    filter: {
      property: titlePropertyName,
      title: { equals },
    },
  });
  for (const r of res.results) {
    if (isFullPage(r)) return r.id;
  }
  return null;
}

function richTextProp(text: string) {
  return {
    type: 'rich_text' as const,
    rich_text: [{ type: 'text' as const, text: { content: text } }],
  };
}

function titleProp(text: string) {
  return {
    type: 'title' as const,
    title: [{ type: 'text' as const, text: { content: text } }],
  };
}

function relationProp(pageIds: string[]) {
  return {
    type: 'relation' as const,
    relation: pageIds.map((id) => ({ id })),
  };
}

export type VideoRowPayload = {
  title: string;
  videoId: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  url: string;
};

export type ChannelRowPayload = {
  channelId: string;
  title: string;
  subscriberCount: number | null;
  viewCount: number | null;
  videoCount: number | null;
  publishedAt: string;
  avgLikes: number | null;
  url: string;
};

/** Build the Notion `properties` blob for a Channels-DB row. */
export function buildChannelProps(
  row: ChannelRowPayload,
): Record<string, unknown> {
  const idName = CANONICAL.channels.channelId;
  const props: Record<string, unknown> = {
    [CANONICAL.channels.title]: titleProp(row.title),
    [idName]: richTextProp(row.channelId),
    [CANONICAL.channels.subscribers]: {
      type: 'number',
      number: row.subscriberCount ?? 0,
    },
    [CANONICAL.channels.viewCount]: {
      type: 'number',
      number: row.viewCount ?? 0,
    },
    [CANONICAL.channels.videoCount]: {
      type: 'number',
      number: row.videoCount ?? 0,
    },
    [CANONICAL.channels.publishedAt]: {
      type: 'date',
      date: row.publishedAt ? { start: row.publishedAt.slice(0, 10) } : null,
    },
    [CANONICAL.channels.url]: {
      type: 'url',
      url: row.url.length > 0 ? row.url : null,
    },
  };
  if (row.avgLikes != null) {
    props[CANONICAL.channels.avgLikes] = { type: 'number', number: row.avgLikes };
  }
  return props;
}

/** Build the Notion `properties` blob for a Videos-DB row. */
export function buildVideoProps(
  v: VideoRowPayload,
  channelPageId: string,
  collectedDate: string,
): Record<string, unknown> {
  return {
    [CANONICAL.videos.title]: titleProp(v.title),
    [CANONICAL.videos.videoId]: richTextProp(v.videoId),
    [CANONICAL.videos.views]: { type: 'number', number: v.views ?? 0 },
    [CANONICAL.videos.likes]: { type: 'number', number: v.likes ?? 0 },
    [CANONICAL.videos.comments]: { type: 'number', number: v.comments ?? 0 },
    [CANONICAL.videos.publishedAt]: {
      type: 'date',
      date: v.publishedAt ? { start: v.publishedAt.slice(0, 10) } : null,
    },
    [CANONICAL.videos.channelRelation]: relationProp([channelPageId]),
    [CANONICAL.videos.url]: {
      type: 'url',
      url: v.url.length > 0 ? v.url : null,
    },
    [CANONICAL.videos.collectedAt]: {
      type: 'date',
      date: { start: collectedDate },
    },
  };
}

/**
 * Create-or-update a Channels-DB row when the caller already knows whether
 * the row exists (e.g. via `findPageIdsByRichTextIn` batch lookup or a
 * Supabase-cached `notion_page_id`). Skips the per-row find query.
 */
export async function writeChannelRow(
  notion: Client,
  dataSourceId: string,
  row: ChannelRowPayload,
  existingPageId: string | null,
): Promise<{ kind: 'created' | 'updated'; pageId: string }> {
  const props = buildChannelProps(row);
  if (existingPageId) {
    await notion.pages.update({
      page_id: existingPageId,
      properties: props as Parameters<Client['pages']['update']>[0]['properties'],
    });
    return { kind: 'updated', pageId: existingPageId };
  }
  const created = await notion.pages.create({
    parent: { type: 'data_source_id', data_source_id: dataSourceId },
    properties: props as Parameters<Client['pages']['create']>[0]['properties'],
  });
  return { kind: 'created', pageId: created.id };
}

/**
 * Create-or-update a Videos-DB row with a pre-resolved `existingPageId`.
 * See `writeChannelRow` for the rationale; same batch-aware pattern.
 */
export async function writeVideoRow(
  notion: Client,
  dataSourceId: string,
  v: VideoRowPayload,
  channelPageId: string,
  collectedDate: string,
  existingPageId: string | null,
): Promise<{ kind: 'created' | 'updated'; pageId: string }> {
  const props = buildVideoProps(v, channelPageId, collectedDate);
  if (existingPageId) {
    await notion.pages.update({
      page_id: existingPageId,
      properties: props as Parameters<Client['pages']['update']>[0]['properties'],
    });
    return { kind: 'updated', pageId: existingPageId };
  }
  const created = await notion.pages.create({
    parent: { type: 'data_source_id', data_source_id: dataSourceId },
    properties: props as Parameters<Client['pages']['create']>[0]['properties'],
  });
  return { kind: 'created', pageId: created.id };
}

export async function upsertChannelRow(
  notion: Client,
  dataSourceId: string,
  row: ChannelRowPayload,
): Promise<{ kind: 'created' | 'updated'; pageId: string }> {
  const existingId = await findPageIdByRichTextEquals(
    notion,
    dataSourceId,
    CANONICAL.channels.channelId,
    row.channelId,
  );
  return writeChannelRow(notion, dataSourceId, row, existingId);
}

export async function upsertVideoRow(
  notion: Client,
  dataSourceId: string,
  v: VideoRowPayload,
  channelPageId: string,
  collectedDate: string,
): Promise<{ kind: 'created' | 'updated'; pageId: string }> {
  const existingId = await findPageIdByRichTextEquals(
    notion,
    dataSourceId,
    CANONICAL.videos.videoId,
    v.videoId,
  );
  return writeVideoRow(
    notion,
    dataSourceId,
    v,
    channelPageId,
    collectedDate,
    existingId,
  );
}

export async function upsertSnapshotRow(
  notion: Client,
  dataSourceId: string,
  row: {
    video_id: string;
    snapshot_date: string;
    views: number | null;
    likes: number | null;
    comments: number | null;
    delta: number | null;
  },
  videoPageId: string,
): Promise<'created' | 'updated'> {
  const rk = `${row.video_id}::${row.snapshot_date}`;
  const props: Record<string, unknown> = {
    [CANONICAL.videoSnapshots.idTitle]: titleProp(rk),
    [CANONICAL.videoSnapshots.videoRelation]: relationProp([videoPageId]),
    [CANONICAL.videoSnapshots.snapshotDate]: {
      type: 'date',
      date: row.snapshot_date ? { start: row.snapshot_date } : null,
    },
    [CANONICAL.videoSnapshots.views]: { type: 'number', number: row.views ?? 0 },
    [CANONICAL.videoSnapshots.likes]: { type: 'number', number: row.likes ?? 0 },
    [CANONICAL.videoSnapshots.comments]: {
      type: 'number',
      number: row.comments ?? 0,
    },
  };
  if (row.delta != null) {
    props[CANONICAL.videoSnapshots.delta] = {
      type: 'number',
      number: row.delta,
    };
  }

  const existingId = await findPageIdByTitleEquals(
    notion,
    dataSourceId,
    CANONICAL.videoSnapshots.idTitle,
    rk,
  );
  if (existingId) {
    await notion.pages.update({
      page_id: existingId,
      properties: props as Parameters<Client['pages']['update']>[0]['properties'],
    });
    return 'updated';
  }
  await notion.pages.create({
    parent: {
      type: 'data_source_id',
      data_source_id: dataSourceId,
    },
    properties: props as Parameters<Client['pages']['create']>[0]['properties'],
  });
  return 'created';
}

export async function upsertChannelSnapshotRow(
  notion: Client,
  dataSourceId: string,
  row: {
    channel_id: string;
    snapshot_date: string;
    subscribers: number | null;
    view_count: number | null;
    video_count: number | null;
    subscriber_delta: number | null;
  },
  channelPageId: string,
): Promise<'created' | 'updated'> {
  const rk = `${row.channel_id}::${row.snapshot_date}`;
  const props: Record<string, unknown> = {
    [CANONICAL.channelSnapshots.idTitle]: titleProp(rk),
    [CANONICAL.channelSnapshots.channelRelation]: relationProp([channelPageId]),
    [CANONICAL.channelSnapshots.snapshotDate]: {
      type: 'date',
      date: row.snapshot_date ? { start: row.snapshot_date } : null,
    },
    [CANONICAL.channelSnapshots.subscribers]: {
      type: 'number',
      number: row.subscribers ?? 0,
    },
    [CANONICAL.channelSnapshots.viewCount]: {
      type: 'number',
      number: row.view_count ?? 0,
    },
    [CANONICAL.channelSnapshots.videoCount]: {
      type: 'number',
      number: row.video_count ?? 0,
    },
  };
  if (row.subscriber_delta != null) {
    props[CANONICAL.channelSnapshots.subscriberDelta] = {
      type: 'number',
      number: row.subscriber_delta,
    };
  }

  const existingId = await findPageIdByTitleEquals(
    notion,
    dataSourceId,
    CANONICAL.channelSnapshots.idTitle,
    rk,
  );
  if (existingId) {
    await notion.pages.update({
      page_id: existingId,
      properties: props as Parameters<Client['pages']['update']>[0]['properties'],
    });
    return 'updated';
  }
  await notion.pages.create({
    parent: {
      type: 'data_source_id',
      data_source_id: dataSourceId,
    },
    properties: props as Parameters<Client['pages']['create']>[0]['properties'],
  });
  return 'created';
}

export async function upsertCommentRow(
  notion: Client,
  dataSourceId: string,
  c: {
    commentId: string;
    videoId: string;
    text: string;
    likeCount: number;
    publishedAt: string;
  },
  videoPageId: string,
): Promise<'created' | 'updated'> {
  const titleText =
    c.text.length > 80 ? `${c.text.slice(0, 77)}...` : c.text;
  const props: Record<string, unknown> = {
    [CANONICAL.comments.title]: titleProp(titleText),
    [CANONICAL.comments.commentId]: richTextProp(c.commentId),
    [CANONICAL.comments.videoRelation]: relationProp([videoPageId]),
    [CANONICAL.comments.body]: richTextProp(c.text),
    [CANONICAL.comments.likeCount]: { type: 'number', number: c.likeCount },
    [CANONICAL.comments.publishedAt]: {
      type: 'date',
      date: c.publishedAt ? { start: c.publishedAt } : null,
    },
  };

  const existingId = await findPageIdByRichTextEquals(
    notion,
    dataSourceId,
    CANONICAL.comments.commentId,
    c.commentId,
  );
  if (existingId) {
    await notion.pages.update({
      page_id: existingId,
      properties: props as Parameters<Client['pages']['update']>[0]['properties'],
    });
    return 'updated';
  }
  await notion.pages.create({
    parent: {
      type: 'data_source_id',
      data_source_id: dataSourceId,
    },
    properties: props as Parameters<Client['pages']['create']>[0]['properties'],
  });
  return 'created';
}

/** Merge related pages into a relation property by display name (keeps existing links). */
export async function mergeRelationPropertyByName(
  notion: Client,
  dsSchema: DataSourceSchema,
  pageId: string,
  relationPropertyName: string,
  addPageIds: string[],
): Promise<void> {
  if (addPageIds.length === 0) return;
  const meta = requireProp(dsSchema, relationPropertyName);
  const page = await notion.pages.retrieve({
    page_id: pageId,
    filter_properties: [meta.id],
  });
  if (!('properties' in page) || !page.properties) {
    throw new Error(`Expected page with properties for merge: ${pageId}`);
  }
  const raw = page.properties[meta.id];
  const cur: string[] = [];
  if (raw && typeof raw === 'object' && 'type' in raw && raw.type === 'relation') {
    const rel = (raw as { relation?: { id: string }[] }).relation;
    if (Array.isArray(rel)) {
      for (const x of rel) {
        if (x?.id) cur.push(x.id);
      }
    }
  }
  const merged = [...new Set([...cur, ...addPageIds])];
  await notion.pages.update({
    page_id: pageId,
    properties: {
      [relationPropertyName]: relationProp(merged),
    } as Parameters<Client['pages']['update']>[0]['properties'],
  });
}

/** Map YouTube `categoryId` (e.g. `"22"`) to Hot Video Daily `videoCategoryId` select label. */
export function mapVideoCategoryToHotSelect(categoryId: string | null): string {
  if (categoryId == null || String(categoryId).length === 0) return '전체';
  const id = String(categoryId).replace(/\D/g, '');
  const m: Record<string, string> = {
    '22': '22 People & Blogs',
    '24': '24 Entertainment',
    '25': '25 News & Politics',
    '26': '26 Howto & Style',
    '27': '27 Education',
  };
  return m[id] ?? '전체';
}

export async function upsertKeywordRow(
  notion: Client,
  dataSourceId: string,
  keywordText: string,
  collectedYmd: string,
): Promise<{ pageId: string; kind: 'created' | 'updated' }> {
  const titleName = CANONICAL.keywords.title;
  const existing = await findPageIdByTitleEquals(
    notion,
    dataSourceId,
    titleName,
    keywordText,
  );
  const statusProp = {
    type: 'status' as const,
    status: { name: '수집중' },
  };
  const dateProp = {
    type: 'date' as const,
    date: { start: collectedYmd },
  };
  if (existing) {
    await notion.pages.update({
      page_id: existing,
      properties: {
        [CANONICAL.keywords.lastCollected]: dateProp,
        [CANONICAL.keywords.status]: statusProp,
      } as Parameters<Client['pages']['update']>[0]['properties'],
    });
    return { pageId: existing, kind: 'updated' };
  }
  const created = await notion.pages.create({
    parent: {
      type: 'data_source_id',
      data_source_id: dataSourceId,
    },
    properties: {
      [titleName]: titleProp(keywordText),
      [CANONICAL.keywords.lastCollected]: dateProp,
      [CANONICAL.keywords.status]: statusProp,
      [CANONICAL.keywords.nounType]: {
        type: 'select',
        select: { name: '일반' },
      },
      [CANONICAL.keywords.priority]: {
        type: 'select',
        select: { name: '4순 역검색' },
      },
    } as Parameters<Client['pages']['create']>[0]['properties'],
  });
  return { pageId: created.id, kind: 'created' };
}

export async function upsertHotVideoDailyRow(
  notion: Client,
  dataSourceId: string,
  row: {
    rowKey: string;
    entryYmd: string;
    chartRank: number;
    regionCode: string;
    categorySelectName: string;
    videoPageId: string;
    viewsAtEntry: number | null;
    seedKeywordPageId: string | null;
  },
): Promise<'created' | 'updated'> {
  const sourceName = 'chart=mostPopular';
  const props: Record<string, unknown> = {
    [CANONICAL.hotVideoDaily.idTitle]: titleProp(row.rowKey),
    [CANONICAL.hotVideoDaily.entryDate]: {
      type: 'date',
      date: { start: row.entryYmd },
    },
    [CANONICAL.hotVideoDaily.chartRank]: {
      type: 'number',
      number: row.chartRank,
    },
    [CANONICAL.hotVideoDaily.regionCode]: {
      type: 'select',
      select: { name: row.regionCode },
    },
    [CANONICAL.hotVideoDaily.videoCategoryId]: {
      type: 'select',
      select: { name: row.categorySelectName },
    },
    [CANONICAL.hotVideoDaily.videoRelation]: relationProp([row.videoPageId]),
    [CANONICAL.hotVideoDaily.source]: {
      type: 'select',
      select: { name: sourceName },
    },
    [CANONICAL.hotVideoDaily.viewsAtEntry]: {
      type: 'number',
      number: row.viewsAtEntry ?? 0,
    },
  };
  if (row.seedKeywordPageId) {
    props[CANONICAL.hotVideoDaily.seedKeywordRelation] = relationProp([
      row.seedKeywordPageId,
    ]);
  }

  const existingId = await findPageIdByTitleEquals(
    notion,
    dataSourceId,
    CANONICAL.hotVideoDaily.idTitle,
    row.rowKey,
  );
  if (existingId) {
    await notion.pages.update({
      page_id: existingId,
      properties: props as Parameters<Client['pages']['update']>[0]['properties'],
    });
    return 'updated';
  }
  await notion.pages.create({
    parent: {
      type: 'data_source_id',
      data_source_id: dataSourceId,
    },
    properties: props as Parameters<Client['pages']['create']>[0]['properties'],
  });
  return 'created';
}

export function chunks<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Collect distinct values for a rich_text property by paging the data source. */
export async function collectRichTextValuesFromDataSource(
  notion: Client,
  dataSourceId: string,
  /** Notion property id (not display name) for filter_properties */
  propertyId: string,
): Promise<string[]> {
  const seen = new Set<string>();
  let cursor: string | undefined;
  do {
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
      filter_properties: [propertyId],
    });
    for (const r of res.results) {
      if (!isFullPage(r)) continue;
      const page = await notion.pages.retrieve({
        page_id: r.id,
        filter_properties: [propertyId],
      });
      if (!isRecord(page) || !('properties' in page) || !isRecord(page.properties)) {
        continue;
      }
      const prop = page.properties[propertyId];
      const id = extractRichTextFromProperty(prop);
      if (id) seen.add(id);
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return [...seen];
}

export async function collectVideoIdsFromDataSource(
  notion: Client,
  dataSourceId: string,
  videoPropertyId: string,
): Promise<string[]> {
  return collectRichTextValuesFromDataSource(notion, dataSourceId, videoPropertyId);
}

export async function collectChannelIdsFromDataSource(
  notion: Client,
  dataSourceId: string,
  channelPropertyId: string,
): Promise<string[]> {
  return collectRichTextValuesFromDataSource(notion, dataSourceId, channelPropertyId);
}

export async function resolveVideoPageId(
  notion: Client,
  videosDataSourceId: string,
  videoId: string,
): Promise<string | null> {
  return findPageIdByRichTextEquals(
    notion,
    videosDataSourceId,
    CANONICAL.videos.videoId,
    videoId,
  );
}

export async function resolveChannelPageId(
  notion: Client,
  channelsDataSourceId: string,
  channelId: string,
): Promise<string | null> {
  return findPageIdByRichTextEquals(
    notion,
    channelsDataSourceId,
    CANONICAL.channels.channelId,
    channelId,
  );
}
