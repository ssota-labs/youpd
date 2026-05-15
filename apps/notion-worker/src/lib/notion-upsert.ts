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

export async function upsertChannelRow(
  notion: Client,
  dataSourceId: string,
  row: {
    channelId: string;
    title: string;
    subscriberCount: number | null;
    viewCount: number | null;
    videoCount: number | null;
    publishedAt: string;
    avgLikes: number | null;
    url: string;
  },
): Promise<{ kind: 'created' | 'updated'; pageId: string }> {
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

  const existingId = await findPageIdByRichTextEquals(
    notion,
    dataSourceId,
    idName,
    row.channelId,
  );
  if (existingId) {
    await notion.pages.update({
      page_id: existingId,
      properties: props as Parameters<Client['pages']['update']>[0]['properties'],
    });
    return { kind: 'updated', pageId: existingId };
  }
  const created = await notion.pages.create({
    parent: {
      type: 'data_source_id',
      data_source_id: dataSourceId,
    },
    properties: props as Parameters<Client['pages']['create']>[0]['properties'],
  });
  return { kind: 'created', pageId: created.id };
}

export async function upsertVideoRow(
  notion: Client,
  dataSourceId: string,
  v: VideoRowPayload,
  channelPageId: string,
  collectedDate: string,
): Promise<'created' | 'updated'> {
  const props: Record<string, unknown> = {
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

  const existingId = await findPageIdByRichTextEquals(
    notion,
    dataSourceId,
    CANONICAL.videos.videoId,
    v.videoId,
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
