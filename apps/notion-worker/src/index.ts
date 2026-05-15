import { Worker } from '@notionhq/workers';
import type { CapabilityContext } from '@notionhq/workers';

import { j } from '@notionhq/workers/schema-builder';

import { youpdRestJson } from './lib/youpd-rest.js';
import {
  collectVideoIdsFromDataSource,
  chunks,
  resolvePropertyMeta,
  resolveTitleProperty,
  type DataSourceSchema,
  type SnapshotColumnNames,
  type VideoColumnNames,
  type VideoRowPayload,
  upsertCommentRow,
  upsertSnapshotRow,
  upsertVideoRow,
} from './lib/notion-upsert.js';

const worker = new Worker();
/** `ntn workers exec --local` resolves `import(m).default.default`; mirror self-ref without breaking deploy. */
(worker as Worker & { default: typeof worker }).default = worker;
export default worker;

const apiPacer = worker.pacer('youpdRest', {
  allowedRequests: 24,
  intervalMs: 60_000,
});

type VideoLike = {
  videoId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  url: string;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) throw new Error(`${name} is not set`);
  return v.trim();
}

function optionalEnv(name: string): string | undefined {
  const v = process.env[name];
  return v?.trim() || undefined;
}

async function dataSourceSchema(
  notion: CapabilityContext['notion'],
  dataSourceId: string,
): Promise<DataSourceSchema> {
  const ds = await notion.dataSources.retrieve({ data_source_id: dataSourceId });
  const out: DataSourceSchema = {};
  for (const [k, v] of Object.entries(ds.properties)) {
    out[k] = { id: v.id, name: v.name, type: v.type };
  }
  return out;
}

function resolveVideoColumns(schema: DataSourceSchema): VideoColumnNames {
  const title = resolveTitleProperty(schema);
  if (!title) {
    throw new Error('Videos data source has no title property.');
  }
  const videoId = resolvePropertyMeta(schema, [
    'videoId',
    'Video ID',
    '영상 ID',
    '영상ID',
  ]);
  if (!videoId) {
    throw new Error(
      'Videos data source: could not resolve a video id column (try videoId, Video ID, 영상 ID).',
    );
  }
  return {
    title,
    videoId: videoId.name,
    channelId: resolvePropertyMeta(schema, ['channelId', 'Channel ID', '채널 ID'])
      ?.name ?? null,
    channelTitle: resolvePropertyMeta(schema, [
      'channelTitle',
      'Channel title',
      '채널',
    ])?.name ?? null,
    views: resolvePropertyMeta(schema, ['조회수(최신)', 'Views', '조회수'])?.name ?? null,
    likes: resolvePropertyMeta(schema, ['좋아요(최신)', 'Likes', '좋아요'])?.name ?? null,
    comments: resolvePropertyMeta(schema, ['댓글수(최신)', 'Comments', '댓글'])?.name ?? null,
    publishedAt: resolvePropertyMeta(schema, ['게시일', 'Published', 'Published at'])
      ?.name ?? null,
    url: resolvePropertyMeta(schema, ['영상링크', 'URL', 'Video URL'])?.name ?? null,
  };
}

function resolveSnapshotColumns(schema: DataSourceSchema): SnapshotColumnNames {
  const title = resolveTitleProperty(schema);
  if (!title) throw new Error('Snapshots data source has no title property.');
  const rowKey = resolvePropertyMeta(schema, ['rowKey', 'Row key', '키']);
  if (!rowKey) {
    throw new Error(
      'Snapshots data source: could not resolve rowKey column (try rowKey).',
    );
  }
  const videoId = resolvePropertyMeta(schema, [
    'videoId',
    'Video ID',
    '영상 ID',
    '영상ID',
  ]);
  if (!videoId) {
    throw new Error('Snapshots data source: could not resolve videoId column.');
  }
  const snapshotDate = resolvePropertyMeta(schema, [
    'snapshotDate',
    'Snapshot date',
    '날짜',
    'Date',
  ]);
  if (!snapshotDate) {
    throw new Error(
      'Snapshots data source: could not resolve snapshotDate column.',
    );
  }
  return {
    title,
    rowKey: rowKey.name,
    videoId: videoId.name,
    snapshotDate: snapshotDate.name,
    views: resolvePropertyMeta(schema, ['views', 'Views', '조회수'])?.name ?? null,
    likes: resolvePropertyMeta(schema, ['likes', 'Likes', '좋아요'])?.name ?? null,
    comments: resolvePropertyMeta(schema, ['comments', 'Comments', '댓글'])?.name ?? null,
  };
}

function resolveCommentColumns(schema: DataSourceSchema) {
  const title = resolveTitleProperty(schema);
  if (!title) throw new Error('Comments data source has no title property.');
  const commentId = resolvePropertyMeta(schema, ['commentId', 'Comment ID']);
  if (!commentId) {
    throw new Error('Comments data source: could not resolve commentId column.');
  }
  const videoId = resolvePropertyMeta(schema, [
    'videoId',
    'Video ID',
    '영상 ID',
  ]);
  if (!videoId) {
    throw new Error('Comments data source: could not resolve videoId column.');
  }
  const text = resolvePropertyMeta(schema, ['text', 'Text', '본문', '내용']);
  if (!text) {
    throw new Error('Comments data source: could not resolve text column.');
  }
  return {
    title,
    commentId: commentId.name,
    videoId: videoId.name,
    text: text.name,
    likeCount: resolvePropertyMeta(schema, ['likeCount', 'Likes', '좋아요'])?.name ?? null,
    publishedAt: resolvePropertyMeta(schema, ['publishedAt', 'Published', '게시일'])
      ?.name ?? null,
  };
}

function videoRowFromLike(v: VideoLike): VideoRowPayload {
  return {
    title: v.title,
    videoId: v.videoId,
    channelId: v.channelId,
    channelTitle: v.channelTitle,
    publishedAt: v.publishedAt,
    views: v.views,
    likes: v.likes,
    comments: v.comments,
    url: v.url,
  };
}

worker.tool('checkWorkspace', {
  title: 'Check YouPD workspace wiring',
  description:
    'Read-only: verifies YOUPD_* data source env vars and that each data source has the expected columns. Run during onboarding.',
  schema: j.object({}),
  hints: { readOnlyHint: true },
  outputSchema: j.object({
    ok: j.boolean(),
    reports: j.array(
      j.object({
        env: j.string(),
        data_source_id: j.string().nullable(),
        status: j.string(),
        detail: j.string().nullable(),
      }),
    ),
  }),
  execute: async (_input, { notion }) => {
    const reports: {
      env: string;
      data_source_id: string | null;
      status: string;
      detail: string | null;
    }[] = [];

    const checks: { env: string; parse: (schema: DataSourceSchema) => void }[] = [
      {
        env: 'YOUPD_VIDEOS_DATA_SOURCE_ID',
        parse: (s) => {
          resolveVideoColumns(s);
        },
      },
      {
        env: 'YOUPD_SNAPSHOTS_DATA_SOURCE_ID',
        parse: (s) => {
          resolveSnapshotColumns(s);
        },
      },
      {
        env: 'YOUPD_COMMENTS_DATA_SOURCE_ID',
        parse: (s) => {
          resolveCommentColumns(s);
        },
      },
    ];

    for (const c of checks) {
      const id = optionalEnv(c.env) ?? null;
      if (!id) {
        reports.push({
          env: c.env,
          data_source_id: null,
          status: 'missing_env',
          detail: 'Set this env var to the target data source id.',
        });
        continue;
      }
      try {
        const schema = await dataSourceSchema(notion, id);
        c.parse(schema);
        reports.push({
          env: c.env,
          data_source_id: id,
          status: 'ok',
          detail: null,
        });
      } catch (e) {
        reports.push({
          env: c.env,
          data_source_id: id,
          status: 'error',
          detail: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const tracked = optionalEnv('YOUPD_TRACKED_VIDEOS_DATA_SOURCE_ID');
    if (tracked) {
      try {
        const schema = await dataSourceSchema(notion, tracked);
        const vid = resolvePropertyMeta(schema, [
          'videoId',
          'Video ID',
          '영상 ID',
          '영상ID',
        ]);
        if (!vid) throw new Error('Could not resolve videoId column on tracked source.');
        reports.push({
          env: 'YOUPD_TRACKED_VIDEOS_DATA_SOURCE_ID',
          data_source_id: tracked,
          status: 'ok',
          detail: null,
        });
      } catch (e) {
        reports.push({
          env: 'YOUPD_TRACKED_VIDEOS_DATA_SOURCE_ID',
          data_source_id: tracked,
          status: 'error',
          detail: e instanceof Error ? e.message : String(e),
        });
      }
    } else {
      reports.push({
        env: 'YOUPD_TRACKED_VIDEOS_DATA_SOURCE_ID',
        data_source_id: null,
        status: 'optional',
        detail:
          'Not set; snapshotTrackedVideos will use YOUPD_VIDEOS_DATA_SOURCE_ID (all rows).',
      });
    }

    const ok = !reports.some((r) => r.status === 'error');
    return { ok, reports };
  },
});

worker.tool('videosByKeyword', {
  title: 'Import videos by keyword into Notion',
  description:
    'Calls YouPD REST search/keyword and upserts videos into the configured Videos data source.',
  schema: j.object({
    keyword: j.string().describe('YouTube search query.'),
    max_results: j.number().describe('1–50 results.').nullable(),
  }),
  outputSchema: j.object({
    upserted: j.number(),
    created: j.number(),
    updated: j.number(),
    quota_session_id: j.string().nullable(),
  }),
  execute: async ({ keyword, max_results }, { notion }) => {
    const dsId = requireEnv('YOUPD_VIDEOS_DATA_SOURCE_ID');
    const schema = await dataSourceSchema(notion, dsId);
    const cols = resolveVideoColumns(schema);
    await apiPacer.wait();
    const env = await youpdRestJson<{
      keyword: string;
      videos: VideoLike[];
      channels: { channelId: string; title: string }[];
    }>('/api/youpd/rest/search/keyword', {
      method: 'POST',
      body: JSON.stringify({
        keyword,
        max_results: max_results ?? 50,
      }),
    });
    let created = 0;
    let updated = 0;
    for (const v of env.data.videos) {
      const kind = await upsertVideoRow(
        notion,
        dsId,
        cols,
        videoRowFromLike(v),
      );
      if (kind === 'created') created += 1;
      else updated += 1;
    }
    return {
      upserted: env.data.videos.length,
      created,
      updated,
      quota_session_id: env.meta.jobId ?? null,
    };
  },
});

worker.tool('channelAllVideos', {
  title: 'Import full channel uploads into Notion',
  description:
    'Calls YouPD REST channels/{id}/videos?all=true and upserts all returned videos into the Videos data source. Suitable for scheduler runs.',
  schema: j.object({
    channel_id: j.string().describe('YouTube channel id (UC...).'),
    max_videos: j
      .number()
      .describe('Optional max videos cap.')
      .nullable(),
  }),
  outputSchema: j.object({
    upserted: j.number(),
    created: j.number(),
    updated: j.number(),
    quota_session_id: j.string().nullable(),
  }),
  execute: async ({ channel_id, max_videos }, { notion }) => {
    const dsId = requireEnv('YOUPD_VIDEOS_DATA_SOURCE_ID');
    const schema = await dataSourceSchema(notion, dsId);
    const cols = resolveVideoColumns(schema);
    await apiPacer.wait();
    const params = new URLSearchParams({ all: 'true' });
    if (max_videos != null) params.set('max_videos', String(max_videos));
    const env = await youpdRestJson<{
      videos: VideoLike[];
    }>(
      `/api/youpd/rest/channels/${encodeURIComponent(channel_id)}/videos?${params.toString()}`,
    );
    let created = 0;
    let updated = 0;
    for (const v of env.data.videos) {
      const kind = await upsertVideoRow(
        notion,
        dsId,
        cols,
        videoRowFromLike(v),
      );
      if (kind === 'created') created += 1;
      else updated += 1;
    }
    return {
      upserted: env.data.videos.length,
      created,
      updated,
      quota_session_id: env.meta.jobId ?? null,
    };
  },
});

worker.tool('videoComments', {
  title: 'Import video comments into Notion',
  description:
    'Calls YouPD REST videos/{id}/comments and upserts each top comment row into the Comments data source.',
  schema: j.object({
    video_id: j.string().describe('YouTube video id.'),
    top_n: j.number().describe('1–100.').nullable(),
  }),
  outputSchema: j.object({
    upserted: j.number(),
    created: j.number(),
    updated: j.number(),
    comments_disabled: j.boolean(),
    quota_session_id: j.string().nullable(),
  }),
  execute: async ({ video_id, top_n }, { notion }) => {
    const dsId = requireEnv('YOUPD_COMMENTS_DATA_SOURCE_ID');
    const schema = await dataSourceSchema(notion, dsId);
    const cols = resolveCommentColumns(schema);
    await apiPacer.wait();
    const qs =
      top_n != null ? `?top_n=${encodeURIComponent(String(top_n))}` : '';
    const env = await youpdRestJson<{
      video_id: string;
      top_comments: {
        commentId: string;
        videoId: string;
        text: string;
        likeCount: number;
        publishedAt: string;
      }[];
      comments_disabled: boolean;
    }>(`/api/youpd/rest/videos/${encodeURIComponent(video_id)}/comments${qs}`);

    let created = 0;
    let updated = 0;
    if (!env.data.comments_disabled) {
      for (const c of env.data.top_comments) {
        const kind = await upsertCommentRow(notion, dsId, cols, {
          commentId: c.commentId,
          videoId: c.videoId,
          text: c.text,
          likeCount: c.likeCount,
          publishedAt: c.publishedAt,
        });
        if (kind === 'created') created += 1;
        else updated += 1;
      }
    }
    return {
      upserted: env.data.top_comments.length,
      created,
      updated,
      comments_disabled: env.data.comments_disabled,
      quota_session_id: env.meta.jobId ?? null,
    };
  },
});

worker.tool('snapshotTrackedVideos', {
  title: 'Snapshot tracked videos into Notion',
  description:
    'Reads video ids from YOUPD_TRACKED_VIDEOS_DATA_SOURCE_ID (fallback: YOUPD_VIDEOS_DATA_SOURCE_ID), calls YouPD REST snapshots/now in batches, and upserts snapshot rows.',
  schema: j.object({}),
  outputSchema: j.object({
    video_ids_processed: j.number(),
    snapshot_rows_upserted: j.number(),
    created: j.number(),
    updated: j.number(),
    batches: j.number(),
    quota_session_ids: j.array(j.string()),
  }),
  execute: async (_input, { notion }) => {
    const videosDs = requireEnv('YOUPD_VIDEOS_DATA_SOURCE_ID');
    const snapsDs = requireEnv('YOUPD_SNAPSHOTS_DATA_SOURCE_ID');

    const trackedDs =
      optionalEnv('YOUPD_TRACKED_VIDEOS_DATA_SOURCE_ID') ?? videosDs;

    const trackedSchema = await dataSourceSchema(notion, trackedDs);
    const videoMeta = resolvePropertyMeta(trackedSchema, [
      'videoId',
      'Video ID',
      '영상 ID',
      '영상ID',
    ]);
    if (!videoMeta) {
      throw new Error(
        'Tracked data source: could not resolve videoId column for reading ids.',
      );
    }

    const videoIds = await collectVideoIdsFromDataSource(
      notion,
      trackedDs,
      videoMeta.id,
    );

    const snapSchema = await dataSourceSchema(notion, snapsDs);
    const snapCols = resolveSnapshotColumns(snapSchema);

    let created = 0;
    let updated = 0;
    let rows = 0;
    const quotaSessionIds: string[] = [];
    const batches = chunks(videoIds, 500);
    let batchIndex = 0;

    for (const batch of batches) {
      if (batch.length === 0) continue;
      await apiPacer.wait();
      const env = await youpdRestJson<{
        snapshots: {
          video_id: string;
          snapshot_date: string;
          views: number | null;
          likes: number | null;
          comments: number | null;
        }[];
      }>('/api/youpd/rest/snapshots/now', {
        method: 'POST',
        body: JSON.stringify({ video_ids: batch }),
      });
      batchIndex += 1;
      if (env.meta.jobId) quotaSessionIds.push(env.meta.jobId);

      for (const s of env.data.snapshots) {
        const kind = await upsertSnapshotRow(notion, snapsDs, snapCols, {
          ...s,
        });
        if (kind === 'created') created += 1;
        else updated += 1;
        rows += 1;
      }
    }

    return {
      video_ids_processed: videoIds.length,
      snapshot_rows_upserted: rows,
      created,
      updated,
      batches: batchIndex,
      quota_session_ids: quotaSessionIds,
    };
  },
});
