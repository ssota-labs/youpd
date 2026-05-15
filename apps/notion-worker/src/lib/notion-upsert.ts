import type { Client } from '@notionhq/client';

export type DataSourcePropertyMeta = {
  id: string;
  name: string;
  type: string;
};

/** Schema map from `notion.dataSources.retrieve`. */
export type DataSourceSchema = Record<string, DataSourcePropertyMeta>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function resolvePropertyMeta(
  schema: DataSourceSchema,
  candidates: readonly string[],
): DataSourcePropertyMeta | null {
  const want = new Set(candidates.map((c) => c.toLowerCase().trim()));
  for (const def of Object.values(schema)) {
    if (want.has(def.name.toLowerCase().trim())) {
      return def;
    }
  }
  return null;
}

export function resolveTitleProperty(schema: DataSourceSchema): string | null {
  for (const def of Object.values(schema)) {
    if (def.type === 'title') return def.name;
  }
  return null;
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

export type VideoColumnNames = {
  title: string;
  videoId: string;
  channelId: string | null;
  channelTitle: string | null;
  views: string | null;
  likes: string | null;
  comments: string | null;
  publishedAt: string | null;
  url: string | null;
};

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

export function buildVideoPageProperties(
  names: VideoColumnNames,
  v: VideoRowPayload,
): Record<string, unknown> {
  const props: Record<string, unknown> = {
    [names.title]: titleProp(v.title),
    [names.videoId]: richTextProp(v.videoId),
  };
  if (names.channelId) props[names.channelId] = richTextProp(v.channelId);
  if (names.channelTitle) props[names.channelTitle] = richTextProp(v.channelTitle);
  if (names.views) props[names.views] = { type: 'number', number: v.views ?? 0 };
  if (names.likes) props[names.likes] = { type: 'number', number: v.likes ?? 0 };
  if (names.comments) props[names.comments] = { type: 'number', number: v.comments ?? 0 };
  if (names.publishedAt) {
    props[names.publishedAt] = {
      type: 'date',
      date: v.publishedAt ? { start: v.publishedAt.slice(0, 10) } : null,
    };
  }
  if (names.url)
    props[names.url] = { type: 'url', url: v.url.length > 0 ? v.url : null };
  return props;
}

export async function upsertVideoRow(
  notion: Client,
  dataSourceId: string,
  names: VideoColumnNames,
  v: VideoRowPayload,
): Promise<'created' | 'updated'> {
  const props = buildVideoPageProperties(names, v);
  const existingId = await findPageIdByRichTextEquals(
    notion,
    dataSourceId,
    names.videoId,
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

export type SnapshotColumnNames = {
  title: string;
  rowKey: string;
  videoId: string;
  snapshotDate: string;
  views: string | null;
  likes: string | null;
  comments: string | null;
};

export async function upsertSnapshotRow(
  notion: Client,
  dataSourceId: string,
  names: SnapshotColumnNames,
  row: {
    video_id: string;
    snapshot_date: string;
    views: number | null;
    likes: number | null;
    comments: number | null;
  },
): Promise<'created' | 'updated'> {
  const rk = `${row.video_id}::${row.snapshot_date}`;
  const props: Record<string, unknown> = {
    [names.title]: titleProp(rk),
    [names.rowKey]: richTextProp(rk),
    [names.videoId]: richTextProp(row.video_id),
    [names.snapshotDate]: row.snapshot_date
      ? {
          type: 'date',
          date: { start: row.snapshot_date },
        }
      : { type: 'date', date: null },
  };
  if (names.views)
    props[names.views] = { type: 'number', number: row.views ?? 0 };
  if (names.likes)
    props[names.likes] = { type: 'number', number: row.likes ?? 0 };
  if (names.comments)
    props[names.comments] = { type: 'number', number: row.comments ?? 0 };

  const existingId = await findPageIdByRichTextEquals(
    notion,
    dataSourceId,
    names.rowKey,
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

export type CommentColumnNames = {
  title: string;
  commentId: string;
  videoId: string;
  text: string;
  likeCount: string | null;
  publishedAt: string | null;
};

export async function upsertCommentRow(
  notion: Client,
  dataSourceId: string,
  names: CommentColumnNames,
  c: {
    commentId: string;
    videoId: string;
    text: string;
    likeCount: number;
    publishedAt: string;
  },
): Promise<'created' | 'updated'> {
  const titleText =
    c.text.length > 80 ? `${c.text.slice(0, 77)}...` : c.text;
  const props: Record<string, unknown> = {
    [names.title]: titleProp(titleText),
    [names.commentId]: richTextProp(c.commentId),
    [names.videoId]: richTextProp(c.videoId),
    [names.text]: richTextProp(c.text),
  };
  if (names.likeCount) props[names.likeCount] = { type: 'number', number: c.likeCount };
  if (names.publishedAt) {
    props[names.publishedAt] = {
      type: 'date',
      date: c.publishedAt ? { start: c.publishedAt.slice(0, 10) } : null,
    };
  }

  const existingId = await findPageIdByRichTextEquals(
    notion,
    dataSourceId,
    names.commentId,
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

/** Collect distinct video IDs by scanning every row in the data source. */
export async function collectVideoIdsFromDataSource(
  notion: Client,
  dataSourceId: string,
  videoPropertyId: string,
): Promise<string[]> {
  const seen = new Set<string>();
  let cursor: string | undefined;
  do {
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
      filter_properties: [videoPropertyId],
    });
    for (const r of res.results) {
      if (!isFullPage(r)) continue;
      const page = await notion.pages.retrieve({
        page_id: r.id,
        filter_properties: [videoPropertyId],
      });
      if (!isRecord(page) || !('properties' in page) || !isRecord(page.properties)) {
        continue;
      }
      const prop = page.properties[videoPropertyId];
      const id = extractRichTextFromProperty(prop);
      if (id) seen.add(id);
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return [...seen];
}
