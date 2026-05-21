import { Worker } from '@notionhq/workers';

import { j } from '@notionhq/workers/schema-builder';
import type { CapabilityContext } from '@notionhq/workers';

import { createLocalTokenBucket } from './lib/pacer-local-fallback.js';
import { youpdRestJson } from './lib/youpd-rest.js';
import { CANONICAL, validateCanonicalSchema, type TableKey } from './lib/schema.js';
import {
  chunks,
  collectChannelIdsFromDataSource,
  collectVideoIdsFromDataSource,
  findPageIdByTitleEquals,
  mapVideoCategoryToHotSelect,
  mergeRelationPropertyByName,
  requireProp,
  type DataSourceSchema,
  resolveChannelPageId,
  upsertChannelRow,
  upsertChannelSnapshotRow,
  upsertCommentRow,
  upsertHotVideoDailyRow,
  upsertKeywordRow,
  upsertSnapshotRow,
  upsertVideoRow,
  type VideoRowPayload,
  resolveVideoPageId,
} from './lib/notion-upsert.js';

const worker = new Worker();
/** `ntn workers exec --local` resolves `import(m).default.default`; mirror self-ref without breaking deploy. */
(worker as Worker & { default: typeof worker }).default = worker;
export default worker;

const YOUPD_REST_PACER_KEY = 'youpdRest';
const YOUPD_REST_PACER_OPTS = {
  allowedRequests: 24,
  intervalMs: 60_000,
} as const;

const apiPacer = worker.pacer(YOUPD_REST_PACER_KEY, YOUPD_REST_PACER_OPTS);

let paceYoupdRestLocal: (() => Promise<void>) | undefined;

async function paceYoupdRest(): Promise<void> {
  try {
    await apiPacer.wait();
  } catch (e) {
    if (
      !(e instanceof Error) ||
      !e.message.includes(`Pacer "${YOUPD_REST_PACER_KEY}" not found`)
    ) {
      throw e;
    }
    paceYoupdRestLocal ??= createLocalTokenBucket(YOUPD_REST_PACER_OPTS);
    await paceYoupdRestLocal();
  }
}

const PT_TZ = 'America/Los_Angeles';

function ptDateYmd(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

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

type VideoApiRow = {
  videoId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  url: string;
  /** Present on hot-chart / some REST payloads (YouTube category id). */
  categoryId?: string | null;
};

type V012Response<T> = {
  data: T;
  warnings: { code: string; message: string }[];
  nextCursor: string | null;
  harvest: { id: string | null; status: string; resultCount: number } | null;
  collectedAt: string;
};

function quotaId<T>(response: V012Response<T>): string | null {
  return response.harvest?.id ?? null;
}

function videoRowFromApi(v: VideoApiRow): VideoRowPayload {
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

const HEALTH_TABLES: { env: string; table: TableKey }[] = [
  { env: 'YOUPD_KEYWORDS_DATA_SOURCE_ID', table: 'keywords' },
  { env: 'YOUPD_VIDEOS_DATA_SOURCE_ID', table: 'videos' },
  { env: 'YOUPD_CHANNELS_DATA_SOURCE_ID', table: 'channels' },
  { env: 'YOUPD_SNAPSHOTS_DATA_SOURCE_ID', table: 'videoSnapshots' },
  { env: 'YOUPD_CHANNEL_SNAPSHOTS_DATA_SOURCE_ID', table: 'channelSnapshots' },
  { env: 'YOUPD_COMMENTS_DATA_SOURCE_ID', table: 'comments' },
  { env: 'YOUPD_HOT_VIDEO_DAILY_DATA_SOURCE_ID', table: 'hotVideoDaily' },
];

worker.tool('healthcheck', {
  title: 'YouPD Notion DB healthcheck',
  description:
    'Read-only: checks YOUPD_* data source env vars and validates each against the canonical column contract (exact names + types).',
  schema: j.object({}),
  hints: { readOnlyHint: true },
  outputSchema: j.object({
    ok: j.boolean(),
    schema_version: j
      .string()
      .describe('Fixed: youpd-worker-canonical-v1'),
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

    for (const h of HEALTH_TABLES) {
      const id = optionalEnv(h.env) ?? null;
      if (!id) {
        reports.push({
          env: h.env,
          data_source_id: null,
          status: 'missing_env',
          detail: 'Set this env var to the target Notion data source id.',
        });
        continue;
      }
      try {
        const schema = await dataSourceSchema(notion, id);
        const v = validateCanonicalSchema(h.table, schema);
        if (!v.ok) {
          reports.push({
            env: h.env,
            data_source_id: id,
            status: 'schema_mismatch',
            detail: v.message,
          });
        } else {
          reports.push({
            env: h.env,
            data_source_id: id,
            status: 'ok',
            detail: null,
          });
        }
      } catch (e) {
        reports.push({
          env: h.env,
          data_source_id: id,
          status: 'error',
          detail: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const ok =
      reports.every((r) => r.status === 'ok') && reports.length > 0;
    return {
      ok,
      schema_version: 'youpd-worker-canonical-v1' as const,
      reports,
    };
  },
});

worker.tool('videosByKeyword', {
  title: 'Import videos by keyword into Notion',
  description:
    'Calls YouPD REST search/keyword with optional multi-page fetch, upserts Channels then Videos, updates Keywords (title = query) with relations and last-collected date.',
  schema: j.object({
    keyword: j.string().describe('YouTube search query.'),
    max_results: j
      .number()
      .describe('Per page, 1–50 (default 50).')
      .nullable(),
    max_total_results: j
      .number()
      .describe(
        'Optional cap across pages (1–500). When set, follows search pagination until cap or exhausted.',
      )
      .nullable(),
  }),
  outputSchema: j.object({
    upserted: j.number(),
    created_videos: j.number(),
    updated_videos: j.number(),
    channels_upserted: j.number(),
    search_pages: j.number().nullable(),
    quota_session_id: j.string().nullable(),
    keyword_page_id: j.string(),
    keyword_row_kind: j.string().describe('"created" | "updated"'),
  }),
  execute: async ({ keyword, max_results, max_total_results }, { notion }) => {
    const videosDs = requireEnv('YOUPD_VIDEOS_DATA_SOURCE_ID');
    const channelsDs = requireEnv('YOUPD_CHANNELS_DATA_SOURCE_ID');
    const keywordsDs = requireEnv('YOUPD_KEYWORDS_DATA_SOURCE_ID');

    const vs = await dataSourceSchema(notion, videosDs);
    const cs = await dataSourceSchema(notion, channelsDs);
    const ks = await dataSourceSchema(notion, keywordsDs);
    const vv = validateCanonicalSchema('videos', vs);
    if (!vv.ok) throw new Error(vv.message);
    const cv = validateCanonicalSchema('channels', cs);
    if (!cv.ok) throw new Error(cv.message);
    const kv = validateCanonicalSchema('keywords', ks);
    if (!kv.ok) throw new Error(kv.message);

    await paceYoupdRest();
    const body: Record<string, unknown> = {
      keyword,
      limit: Math.min(50, Math.max(1, max_total_results ?? max_results ?? 50)),
      persist: true,
    };

    const env = await youpdRestJson<V012Response<{
      keyword: string;
      videos: VideoApiRow[];
      channels: {
        channelId: string;
        title: string;
        publishedAt: string;
        subscriberCount: number | null;
        videoCount: number | null;
        viewCount: number | null;
        url: string;
      }[];
      quotaSessionId: string | null;
    }>>('/api/youpd/rest/youtube/search/videos', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const result = env.data.data;

    const collected = ptDateYmd();
    const channelPageById = new Map<string, string>();

    let chUpserts = 0;
    for (const ch of result.channels) {
      const u = await upsertChannelRow(notion, channelsDs, {
        channelId: ch.channelId,
        title: ch.title,
        subscriberCount: ch.subscriberCount,
        viewCount: ch.viewCount,
        videoCount: ch.videoCount,
        publishedAt: ch.publishedAt,
        avgLikes: null,
        url: ch.url,
      });
      channelPageById.set(ch.channelId, u.pageId);
      chUpserts += 1;
    }

    let created = 0;
    let updated = 0;
    const videoPageIds: string[] = [];
    for (const v of result.videos) {
      const chPage =
        channelPageById.get(v.channelId) ??
        (() => {
          throw new Error(
            `Missing channel page for ${v.channelId}; channels array should include it.`,
          );
        })();
      const row = await upsertVideoRow(
        notion,
        videosDs,
        videoRowFromApi(v),
        chPage,
        collected,
      );
      if (row.kind === 'created') created += 1;
      else updated += 1;
      videoPageIds.push(row.pageId);
    }

    const kw = await upsertKeywordRow(notion, keywordsDs, keyword.trim(), collected);
    await mergeRelationPropertyByName(
      notion,
      ks,
      kw.pageId,
      CANONICAL.keywords.videosRelation,
      videoPageIds,
    );
    await mergeRelationPropertyByName(
      notion,
      ks,
      kw.pageId,
      CANONICAL.keywords.channelsRelation,
      [...new Set(channelPageById.values())],
    );

    return {
      upserted: result.videos.length,
      created_videos: created,
      updated_videos: updated,
      channels_upserted: chUpserts,
      search_pages: null,
      quota_session_id: quotaId(env.data),
      keyword_page_id: kw.pageId,
      keyword_row_kind: kw.kind,
    };
  },
});

worker.tool('hotVideoDailyFromChart', {
  title: 'Import YouTube mostPopular chart into Hot Video Daily',
  description:
    'GET YouPD REST `/trending/hot-chart`, upserts channels/videos as needed, writes one Hot Video Daily row per chart position.',
  schema: j.object({
    region_code: j.string().nullable(),
    category_id: j.string().nullable(),
    limit: j.number().nullable(),
    seed_keyword: j
      .string()
      .describe('Keywords row title (키워드) to link, if it exists.')
      .nullable(),
  }),
  outputSchema: j.object({
    entries: j.number(),
    hot_created: j.number(),
    hot_updated: j.number(),
    videos_touched: j.number(),
    quota_session_id: j.string().nullable(),
  }),
  execute: async (
    { region_code, category_id, limit, seed_keyword },
    { notion },
  ) => {
    const videosDs = requireEnv('YOUPD_VIDEOS_DATA_SOURCE_ID');
    const channelsDs = requireEnv('YOUPD_CHANNELS_DATA_SOURCE_ID');
    const keywordsDs = requireEnv('YOUPD_KEYWORDS_DATA_SOURCE_ID');
    const hotDs = requireEnv('YOUPD_HOT_VIDEO_DAILY_DATA_SOURCE_ID');

    const vs = await dataSourceSchema(notion, videosDs);
    const cs = await dataSourceSchema(notion, channelsDs);
    const ks = await dataSourceSchema(notion, keywordsDs);
    const hs = await dataSourceSchema(notion, hotDs);
    for (const [tbl, sch] of [
      ['videos', vs],
      ['channels', cs],
      ['keywords', ks],
      ['hotVideoDaily', hs],
    ] as [TableKey, DataSourceSchema][]) {
      const r = validateCanonicalSchema(tbl, sch);
      if (!r.ok) throw new Error(r.message);
    }

    const rc = (region_code ?? 'KR').trim() || 'KR';
    const lim = limit ?? 50;
    const params = new URLSearchParams({
      regionCode: rc,
      limit: String(Math.min(50, Math.max(1, lim))),
    });
    if (category_id != null && String(category_id).trim().length > 0) {
      params.set('categoryId', String(category_id).trim());
    }
    params.set('persist', 'true');

    await paceYoupdRest();
    const env = await youpdRestJson<V012Response<{
      regionCode: string;
      categoryId: string | null;
      videos: VideoApiRow[];
    }>>(`/api/youpd/rest/youtube/trending/videos?${params.toString()}`, {
      method: 'GET',
    });
    const result = env.data.data;

    let seedKeywordPageId: string | null = null;
    if (seed_keyword != null && seed_keyword.trim().length > 0) {
      seedKeywordPageId = await findPageIdByTitleEquals(
        notion,
        keywordsDs,
        CANONICAL.keywords.title,
        seed_keyword.trim(),
      );
    }

    const collected = ptDateYmd();
    const channelPageById = new Map<string, string>();
    const firstByChannel = new Map<string, VideoApiRow>();
    for (const v of result.videos) {
      if (!firstByChannel.has(v.channelId)) firstByChannel.set(v.channelId, v);
    }
    for (const v of firstByChannel.values()) {
      let chPage = await resolveChannelPageId(notion, channelsDs, v.channelId);
      if (!chPage) {
        const u = await upsertChannelRow(notion, channelsDs, {
          channelId: v.channelId,
          title: v.channelTitle,
          subscriberCount: null,
          viewCount: null,
          videoCount: null,
          publishedAt: v.publishedAt,
          avgLikes: null,
          url: `https://www.youtube.com/channel/${encodeURIComponent(v.channelId)}`,
        });
        chPage = u.pageId;
      }
      channelPageById.set(v.channelId, chPage);
    }

    let hotCreated = 0;
    let hotUpdated = 0;
    let rank = 0;
    for (const v of result.videos) {
      rank += 1;
      const chPage =
        channelPageById.get(v.channelId) ??
        (() => {
          throw new Error(`Missing channel page for ${v.channelId}`);
        })();
      const vr = await upsertVideoRow(
        notion,
        videosDs,
        videoRowFromApi(v),
        chPage,
        collected,
      );

      const rowKey = `${v.videoId}::${collected}::${rc}::${rank}`;
      const hk = await upsertHotVideoDailyRow(notion, hotDs, {
        rowKey,
        entryYmd: collected,
        chartRank: rank,
        regionCode: rc,
        categorySelectName: mapVideoCategoryToHotSelect(v.categoryId ?? null),
        videoPageId: vr.pageId,
        viewsAtEntry: v.views,
        seedKeywordPageId,
      });
      if (hk === 'created') hotCreated += 1;
      else hotUpdated += 1;
    }

    return {
      entries: result.videos.length,
      hot_created: hotCreated,
      hot_updated: hotUpdated,
      videos_touched: result.videos.length,
      quota_session_id: quotaId(env.data),
    };
  },
});

worker.tool('channelAllVideos', {
  title: 'Import full channel uploads into Notion',
  description:
    'Calls YouPD REST channels/{id}/videos?all=true, upserts the channel row then all video rows.',
  schema: j.object({
    channel_id: j.string().describe('YouTube channel id (UC...).'),
    max_videos: j
      .number()
      .describe('Optional max videos cap.')
      .nullable(),
  }),
  outputSchema: j.object({
    upserted: j.number(),
    created_videos: j.number(),
    updated_videos: j.number(),
    channel_upserted: j.boolean(),
    quota_session_id: j.string().nullable(),
  }),
  execute: async ({ channel_id, max_videos }, { notion }) => {
    const videosDs = requireEnv('YOUPD_VIDEOS_DATA_SOURCE_ID');
    const channelsDs = requireEnv('YOUPD_CHANNELS_DATA_SOURCE_ID');

    const vs = await dataSourceSchema(notion, videosDs);
    const cs = await dataSourceSchema(notion, channelsDs);
    const vv = validateCanonicalSchema('videos', vs);
    if (!vv.ok) throw new Error(vv.message);
    const cv = validateCanonicalSchema('channels', cs);
    if (!cv.ok) throw new Error(cv.message);

    const params = new URLSearchParams({ persist: 'true' });
    if (max_videos != null) params.set('limit', String(max_videos));

    await paceYoupdRest();
    const env = await youpdRestJson<V012Response<{
      channel: {
        channelId: string;
        title: string;
        publishedAt: string;
        subscriberCount: number | null;
        videoCount: number | null;
        viewCount: number | null;
        url: string;
      } | null;
      videos: VideoApiRow[];
    }>>(
      `/api/youpd/rest/youtube/channels/${encodeURIComponent(channel_id)}/videos?${params.toString()}`,
    );
    const result = env.data.data;

    if (!result.channel) {
      throw new Error(`Channel not found: ${channel_id}`);
    }

    const ch = result.channel;
    const { pageId: chPage } = await upsertChannelRow(notion, channelsDs, {
      channelId: ch.channelId,
      title: ch.title,
      subscriberCount: ch.subscriberCount,
      viewCount: ch.viewCount,
      videoCount: ch.videoCount,
      publishedAt: ch.publishedAt,
      avgLikes: null,
      url: ch.url,
    });

    const collected = ptDateYmd();
    let created = 0;
    let updated = 0;
    for (const v of result.videos) {
      const row = await upsertVideoRow(
        notion,
        videosDs,
        videoRowFromApi(v),
        chPage,
        collected,
      );
      if (row.kind === 'created') created += 1;
      else updated += 1;
    }

    return {
      upserted: result.videos.length,
      created_videos: created,
      updated_videos: updated,
      channel_upserted: true,
      quota_session_id: quotaId(env.data),
    };
  },
});

worker.tool('videoComments', {
  title: 'Import video comments into Notion',
  description:
    'Calls YouPD REST videos/{id}/comments and upserts rows into the Comments DB (relation to Videos).',
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
    const videosDs = requireEnv('YOUPD_VIDEOS_DATA_SOURCE_ID');
    const commentsDs = requireEnv('YOUPD_COMMENTS_DATA_SOURCE_ID');

    const vschema = await dataSourceSchema(notion, videosDs);
    const cschema = await dataSourceSchema(notion, commentsDs);
    const vx = validateCanonicalSchema('videos', vschema);
    if (!vx.ok) throw new Error(vx.message);
    const cx = validateCanonicalSchema('comments', cschema);
    if (!cx.ok) throw new Error(cx.message);

    const videoPageId = await resolveVideoPageId(notion, videosDs, video_id);
    if (!videoPageId) {
      throw new Error(
        `No Videos DB row for video_id ${video_id}. Import the video first.`,
      );
    }

    await paceYoupdRest();
    const qs =
      top_n != null ? `?limit=${encodeURIComponent(String(top_n))}` : '';
    const env = await youpdRestJson<V012Response<{
      videoId: string;
      comments: {
        commentId: string;
        videoId: string;
        text: string;
        likeCount: number;
        publishedAt: string;
      }[];
      commentsDisabled: boolean;
    }>>(
      `/api/youpd/rest/youtube/videos/${encodeURIComponent(video_id)}/comments${qs}`,
    );
    const result = env.data.data;

    let created = 0;
    let updated = 0;
    if (!result.commentsDisabled) {
      for (const c of result.comments) {
        const kind = await upsertCommentRow(
          notion,
          commentsDs,
          {
            commentId: c.commentId,
            videoId: c.videoId,
            text: c.text,
            likeCount: c.likeCount,
            publishedAt: c.publishedAt,
          },
          videoPageId,
        );
        if (kind === 'created') created += 1;
        else updated += 1;
      }
    }
    return {
      upserted: result.comments.length,
      created,
      updated,
      comments_disabled: result.commentsDisabled,
      quota_session_id: quotaId(env.data),
    };
  },
});

worker.tool('snapshotVideos', {
  title: 'Snapshot videos into Notion',
  description:
    'Reads video ids from the Videos data source, calls REST snapshots/now, writes Video Snapshots rows linked to each video page.',
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

    const vschema = await dataSourceSchema(notion, videosDs);
    const sschema = await dataSourceSchema(notion, snapsDs);
    const vv = validateCanonicalSchema('videos', vschema);
    if (!vv.ok) throw new Error(vv.message);
    const sv = validateCanonicalSchema('videoSnapshots', sschema);
    if (!sv.ok) throw new Error(sv.message);

    const vidProp = requireProp(vschema, CANONICAL.videos.videoId);
    const videoIds = await collectVideoIdsFromDataSource(
      notion,
      videosDs,
      vidProp.id,
    );

    let created = 0;
    let updated = 0;
    let rows = 0;
    const quotaSessionIds: string[] = [];
    const batches = chunks(videoIds, 50);
    let batchIndex = 0;

    for (const batch of batches) {
      if (batch.length === 0) continue;
      await paceYoupdRest();
      const env = await youpdRestJson<V012Response<{
        videoSnapshots: {
          video_id: string;
          snapshot_date: string;
          views: number | null;
          likes: number | null;
          comments: number | null;
        }[];
        quotaSessionIds: string[];
      }>>('/api/youpd/rest/youtube/snapshots/capture', {
        method: 'POST',
        body: JSON.stringify({ videoIds: batch, persist: false }),
      });
      batchIndex += 1;
      quotaSessionIds.push(...env.data.data.quotaSessionIds);

      for (const s of env.data.data.videoSnapshots) {
        const videoPageId = await resolveVideoPageId(notion, videosDs, s.video_id);
        if (!videoPageId) continue;
        const kind = await upsertSnapshotRow(notion, snapsDs, {
          ...s,
          delta: null,
        }, videoPageId);
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

worker.tool('snapshotChannels', {
  title: 'Snapshot tracked channels into Notion',
  description:
    'Reads channelId values from the Channels data source, fetches metrics via REST, upserts Channel Snapshots rows.',
  schema: j.object({}),
  outputSchema: j.object({
    channel_ids_processed: j.number(),
    snapshot_rows_upserted: j.number(),
    created: j.number(),
    updated: j.number(),
    batches: j.number(),
    quota_session_ids: j.array(j.string()),
  }),
  execute: async (_input, { notion }) => {
    const channelsDs = requireEnv('YOUPD_CHANNELS_DATA_SOURCE_ID');
    const chSnapDs = requireEnv('YOUPD_CHANNEL_SNAPSHOTS_DATA_SOURCE_ID');

    const cschema = await dataSourceSchema(notion, channelsDs);
    const sschema = await dataSourceSchema(notion, chSnapDs);
    const cv = validateCanonicalSchema('channels', cschema);
    if (!cv.ok) throw new Error(cv.message);
    const sv = validateCanonicalSchema('channelSnapshots', sschema);
    if (!sv.ok) throw new Error(sv.message);

    const idProp = requireProp(cschema, CANONICAL.channels.channelId);
    const channelIds = await collectChannelIdsFromDataSource(
      notion,
      channelsDs,
      idProp.id,
    );

    let created = 0;
    let updated = 0;
    let rows = 0;
    const quotaSessionIds: string[] = [];
    const batches = chunks(channelIds, 50);
    let batchIndex = 0;

    for (const batch of batches) {
      if (batch.length === 0) continue;
      await paceYoupdRest();
      const env = await youpdRestJson<V012Response<{
        channelSnapshots: {
          channel_id: string;
          snapshot_date: string;
          subscribers: number | null;
          view_count: number | null;
          video_count: number | null;
        }[];
        quotaSessionIds: string[];
      }>>('/api/youpd/rest/youtube/snapshots/capture', {
        method: 'POST',
        body: JSON.stringify({ channelIds: batch, persist: false }),
      });
      batchIndex += 1;
      quotaSessionIds.push(...env.data.data.quotaSessionIds);

      for (const s of env.data.data.channelSnapshots) {
        const chPage = await resolveChannelPageId(
          notion,
          channelsDs,
          s.channel_id,
        );
        if (!chPage) continue;
        const kind = await upsertChannelSnapshotRow(
          notion,
          chSnapDs,
          {
            channel_id: s.channel_id,
            snapshot_date: s.snapshot_date,
            subscribers: s.subscribers,
            view_count: s.view_count,
            video_count: s.video_count,
            subscriber_delta: null,
          },
          chPage,
        );
        if (kind === 'created') created += 1;
        else updated += 1;
        rows += 1;
      }
    }

    return {
      channel_ids_processed: channelIds.length,
      snapshot_rows_upserted: rows,
      created,
      updated,
      batches: batchIndex,
      quota_session_ids: quotaSessionIds,
    };
  },
});
