import { Worker } from '@notionhq/workers';

import { j } from '@notionhq/workers/schema-builder';
import type { CapabilityContext } from '@notionhq/workers';

import { createLocalTokenBucket } from './lib/pacer-local-fallback.js';
import { youpdRestJson } from './lib/youpd-rest.js';
import { CANONICAL, validateCanonicalSchema, type TableKey } from './lib/schema.js';
import {
  TRACKING_PERIOD_MONTHLY,
  TRACKING_PERIOD_WEEKLY,
  plannedSlot,
} from './lib/tracking-slots.js';
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
  { env: 'YOUPD_KEYWORD_IDEAS_DATA_SOURCE_ID', table: 'keywordIdeas' },
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
      max_results: max_results ?? 50,
    };
    if (max_total_results != null) {
      body.max_total_results = max_total_results;
    }

    const env = await youpdRestJson<{
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
      search_pages?: number;
    }>('/api/youpd/rest/search/keyword', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const collected = ptDateYmd();
    const channelPageById = new Map<string, string>();

    let chUpserts = 0;
    for (const ch of env.data.channels) {
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
    for (const v of env.data.videos) {
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
      upserted: env.data.videos.length,
      created_videos: created,
      updated_videos: updated,
      channels_upserted: chUpserts,
      search_pages: env.data.search_pages ?? null,
      quota_session_id: env.meta.jobId ?? null,
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
      region_code: rc,
      limit: String(Math.min(50, Math.max(1, lim))),
    });
    if (category_id != null && String(category_id).trim().length > 0) {
      params.set('category_id', String(category_id).trim());
    }

    await paceYoupdRest();
    const env = await youpdRestJson<{
      region_code: string;
      category_id: string | null;
      videos: VideoApiRow[];
    }>(`/api/youpd/rest/trending/hot-chart?${params.toString()}`, {
      method: 'GET',
    });

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
    for (const v of env.data.videos) {
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
    for (const v of env.data.videos) {
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
      entries: env.data.videos.length,
      hot_created: hotCreated,
      hot_updated: hotUpdated,
      videos_touched: env.data.videos.length,
      quota_session_id: env.meta.jobId ?? null,
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

    const params = new URLSearchParams({ all: 'true' });
    if (max_videos != null) params.set('max_videos', String(max_videos));

    await paceYoupdRest();
    const env = await youpdRestJson<{
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
    }>(
      `/api/youpd/rest/channels/${encodeURIComponent(channel_id)}/videos?${params.toString()}`,
    );

    if (!env.data.channel) {
      throw new Error(`Channel not found: ${channel_id}`);
    }

    const ch = env.data.channel;
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
    for (const v of env.data.videos) {
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
      upserted: env.data.videos.length,
      created_videos: created,
      updated_videos: updated,
      channel_upserted: true,
      quota_session_id: env.meta.jobId ?? null,
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
      upserted: env.data.top_comments.length,
      created,
      updated,
      comments_disabled: env.data.comments_disabled,
      quota_session_id: env.meta.jobId ?? null,
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
      const env = await youpdRestJson<{
        snapshots: {
          channel_id: string;
          snapshot_date: string;
          subscribers: number | null;
          view_count: number | null;
          video_count: number | null;
        }[];
      }>('/api/youpd/rest/snapshots/channels', {
        method: 'POST',
        body: JSON.stringify({ channel_ids: batch }),
      });
      batchIndex += 1;
      if (env.meta.jobId) quotaSessionIds.push(env.meta.jobId);

      for (const s of env.data.snapshots) {
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

const TRACKING_STATUS_ACTIVE = '활성';
const TRACKING_PERIOD_EXCLUDE = ['수동', '중지'] as const;
const DEFAULT_RESULTS_PER_KEYWORD = 300;

type KeywordIdeaRow = {
  pageId: string;
  keyword: string;
  searchCount: number;
  trackingSlot: number | null;
  trackingPeriod: string | null;
};

function readTitleText(
  page: unknown,
  propertyName: string,
): string {
  if (!page || typeof page !== 'object' || !('properties' in page)) return '';
  const props = (page as { properties: Record<string, unknown> }).properties;
  const prop = props[propertyName];
  if (!prop || typeof prop !== 'object' || !('type' in prop)) return '';
  if ((prop as { type: string }).type !== 'title') return '';
  const title = (prop as { title?: Array<{ plain_text?: string }> }).title;
  if (!Array.isArray(title)) return '';
  return title.map((t) => t?.plain_text ?? '').join('').trim();
}

function readNumber(
  page: unknown,
  propertyName: string,
): number {
  if (!page || typeof page !== 'object' || !('properties' in page)) return 0;
  const props = (page as { properties: Record<string, unknown> }).properties;
  const prop = props[propertyName];
  if (!prop || typeof prop !== 'object' || !('type' in prop)) return 0;
  if ((prop as { type: string }).type !== 'number') return 0;
  const n = (prop as { number?: number | null }).number;
  return typeof n === 'number' ? n : 0;
}

function readNumberOrNull(
  page: unknown,
  propertyName: string,
): number | null {
  if (!page || typeof page !== 'object' || !('properties' in page)) return null;
  const props = (page as { properties: Record<string, unknown> }).properties;
  const prop = props[propertyName];
  if (!prop || typeof prop !== 'object' || !('type' in prop)) return null;
  if ((prop as { type: string }).type !== 'number') return null;
  const n = (prop as { number?: number | null }).number;
  return typeof n === 'number' ? n : null;
}

function readSelectName(
  page: unknown,
  propertyName: string,
): string | null {
  if (!page || typeof page !== 'object' || !('properties' in page)) return null;
  const props = (page as { properties: Record<string, unknown> }).properties;
  const prop = props[propertyName];
  if (!prop || typeof prop !== 'object' || !('type' in prop)) return null;
  if ((prop as { type: string }).type !== 'select') return null;
  const select = (prop as { select?: { name?: string } | null }).select;
  return select?.name ?? null;
}

worker.tool('trackKeywordIdeasDue', {
  title: 'Run repeat searches for due Keyword Ideas',
  description:
    'Reads Keyword Ideas rows where Notion formula `다음 스케줄러 추출 = true` and `트래킹 상태 = 활성`, runs the v0.6 keyword search/upsert path with `results_per_keyword` (default 300) pagination, then updates 마지막 검색일·검색 횟수·상태·트래킹 슬롯 and appends Keywords rows to the idea relation. `다음 검색 예정일` is a Notion formula (worker never writes it). `최근 결과 메모` is operator/AI only. Partial failures are tolerated. Modes: steady_state (default) processes formula-due rows; initial_catchup is the same surface but accepts a higher default limit. `force_rebalance` reassigns the slot even when one is already set.',
  schema: j.object({
    keyword_idea_limit: j
      .number()
      .describe('Max Keyword Ideas to process per run. Default env YOUPD_KEYWORD_IDEA_LIMIT, falls back to 20 (steady_state) / 200 (initial_catchup).')
      .nullable(),
    results_per_keyword: j
      .number()
      .describe(
        'YouTube results to collect per keyword via REST pagination. Default env YOUPD_RESULTS_PER_KEYWORD, falls back to 300. Use 50 for cheap probes.',
      )
      .nullable(),
    mode: j
      .string()
      .describe('"steady_state" (default) or "initial_catchup".')
      .nullable(),
    force_rebalance: j
      .boolean()
      .describe('When true, reassign 트래킹 슬롯 even if a value already exists.')
      .nullable(),
    dry_run: j
      .boolean()
      .describe(
        'If true, list due ideas, planned slot, and expected quota without writing.',
      )
      .nullable(),
  }),
  outputSchema: j.object({
    ok: j.boolean(),
    enabled: j.boolean(),
    mode: j.string(),
    processed: j.number(),
    succeeded: j.number(),
    failed: j.number(),
    dry_run: j.boolean(),
    results_per_keyword: j.number(),
    expected_quota_units: j.number().nullable(),
    slot_distribution: j.object({
      weekly: j.array(
        j.object({ slot: j.number(), count: j.number() }),
      ),
      monthly: j.array(
        j.object({ slot: j.number(), count: j.number() }),
      ),
    }),
    ideas: j.array(
      j.object({
        page_id: j.string(),
        keyword: j.string(),
        planned_slot: j.number().nullable(),
        planned_period: j.string().nullable(),
        status: j.string().describe('"ok" | "error" | "dry"'),
        error: j.string().nullable(),
      }),
    ),
  }),
  execute: async (
    {
      keyword_idea_limit,
      results_per_keyword,
      mode,
      force_rebalance,
      dry_run,
    },
    { notion },
  ) => {
    const runMode: 'steady_state' | 'initial_catchup' =
      mode === 'initial_catchup' ? 'initial_catchup' : 'steady_state';
    const forceRebalance = force_rebalance === true;
    const envResults = optionalEnv('YOUPD_RESULTS_PER_KEYWORD');
    const resolvedResultsPerKeyword = Math.min(
      500,
      Math.max(
        1,
        results_per_keyword ??
          (envResults ? Number(envResults) : DEFAULT_RESULTS_PER_KEYWORD),
      ),
    );
    const emptyDistribution = () => ({
      weekly: [] as { slot: number; count: number }[],
      monthly: [] as { slot: number; count: number }[],
    });
    const distFromCounts = (
      counts: Record<number, number>,
    ): { slot: number; count: number }[] =>
      Object.entries(counts)
        .map(([k, v]) => ({ slot: Number(k), count: v }))
        .sort((a, b) => a.slot - b.slot);
    const enabledFlag = optionalEnv('YOUPD_KEYWORD_TRACKING_ENABLED');
    if (enabledFlag != null && enabledFlag.toLowerCase() === 'false') {
      return {
        ok: true,
        enabled: false,
        mode: runMode,
        processed: 0,
        succeeded: 0,
        failed: 0,
        dry_run: dry_run ?? false,
        results_per_keyword: resolvedResultsPerKeyword,
        expected_quota_units: null,
        slot_distribution: emptyDistribution(),
        ideas: [],
      };
    }

    const ideasDs = requireEnv('YOUPD_KEYWORD_IDEAS_DATA_SOURCE_ID');
    const videosDs = requireEnv('YOUPD_VIDEOS_DATA_SOURCE_ID');
    const channelsDs = requireEnv('YOUPD_CHANNELS_DATA_SOURCE_ID');
    const keywordsDs = requireEnv('YOUPD_KEYWORDS_DATA_SOURCE_ID');

    const ideasSchema = await dataSourceSchema(notion, ideasDs);
    const vs = await dataSourceSchema(notion, videosDs);
    const cs = await dataSourceSchema(notion, channelsDs);
    const ks = await dataSourceSchema(notion, keywordsDs);
    for (const [tbl, sch] of [
      ['keywordIdeas', ideasSchema],
      ['videos', vs],
      ['channels', cs],
      ['keywords', ks],
    ] as [TableKey, DataSourceSchema][]) {
      const r = validateCanonicalSchema(tbl, sch);
      if (!r.ok) throw new Error(r.message);
    }

    const envLimit = optionalEnv('YOUPD_KEYWORD_IDEA_LIMIT');
    const defaultLimit = runMode === 'initial_catchup' ? 200 : 20;
    const upperLimit = runMode === 'initial_catchup' ? 200 : 50;
    const limit = Math.min(
      upperLimit,
      Math.max(
        1,
        keyword_idea_limit ?? (envLimit ? Number(envLimit) : defaultLimit),
      ),
    );

    const query = await notion.dataSources.query({
      data_source_id: ideasDs,
      page_size: limit,
      filter: {
        and: [
          {
            property: CANONICAL.keywordIdeas.dueForScheduler,
            formula: { checkbox: { equals: true } },
          },
          {
            property: CANONICAL.keywordIdeas.trackingStatus,
            select: { equals: TRACKING_STATUS_ACTIVE },
          },
          ...TRACKING_PERIOD_EXCLUDE.map((name) => ({
            property: CANONICAL.keywordIdeas.trackingPeriod,
            select: { does_not_equal: name },
          })),
        ],
      },
      sorts: [
        {
          property: CANONICAL.keywordIdeas.priority,
          direction: 'ascending',
        },
        {
          property: CANONICAL.keywordIdeas.lastSearchedAt,
          direction: 'ascending',
        },
      ],
    });

    const dueRows: KeywordIdeaRow[] = [];
    for (const r of query.results) {
      if (typeof r !== 'object' || r === null || !('id' in r)) continue;
      const pageId = (r as { id: string }).id;
      const keyword = readTitleText(r, CANONICAL.keywordIdeas.title);
      if (!keyword) continue;
      const searchCount = readNumber(r, CANONICAL.keywordIdeas.searchCount);
      const trackingSlot = readNumberOrNull(
        r,
        CANONICAL.keywordIdeas.trackingSlot,
      );
      const trackingPeriod = readSelectName(
        r,
        CANONICAL.keywordIdeas.trackingPeriod,
      );
      dueRows.push({
        pageId,
        keyword,
        searchCount,
        trackingSlot,
        trackingPeriod,
      });
    }

    // YouTube units per keyword: ceil(N/50) search.list pages + same many
    // videos.list, plus 1 channels.list at the end → roughly 2*pages + 1.
    const pagesPerKeyword = Math.max(
      1,
      Math.ceil(resolvedResultsPerKeyword / 50),
    );
    const unitsPerKeyword = pagesPerKeyword * 2 + 1;

    const buildDistribution = (
      rows: { pageId: string; trackingPeriod: string | null; trackingSlot: number | null }[],
    ) => {
      const weekly: Record<number, number> = {};
      const monthly: Record<number, number> = {};
      for (const row of rows) {
        const slot = plannedSlot(
          row.pageId,
          row.trackingPeriod,
          row.trackingSlot,
          forceRebalance,
        );
        if (slot == null) continue;
        const bucket =
          row.trackingPeriod === TRACKING_PERIOD_MONTHLY ? monthly : weekly;
        bucket[slot] = (bucket[slot] ?? 0) + 1;
      }
      return {
        weekly: distFromCounts(weekly),
        monthly: distFromCounts(monthly),
      };
    };

    const isDry = dry_run === true;
    if (isDry) {
      const dist = buildDistribution(dueRows);
      return {
        ok: true,
        enabled: true,
        mode: runMode,
        processed: dueRows.length,
        succeeded: 0,
        failed: 0,
        dry_run: true,
        results_per_keyword: resolvedResultsPerKeyword,
        expected_quota_units: dueRows.length * unitsPerKeyword,
        slot_distribution: dist,
        ideas: dueRows.map((row) => ({
          page_id: row.pageId,
          keyword: row.keyword,
          planned_slot: plannedSlot(
            row.pageId,
            row.trackingPeriod,
            row.trackingSlot,
            forceRebalance,
          ),
          planned_period: row.trackingPeriod,
          status: 'dry' as const,
          error: null,
        })),
      };
    }

    let succeeded = 0;
    let failed = 0;
    const ideaReports: {
      page_id: string;
      keyword: string;
      planned_slot: number | null;
      planned_period: string | null;
      status: string;
      error: string | null;
    }[] = [];

    for (const idea of dueRows) {
      try {
        await notion.pages.update({
          page_id: idea.pageId,
          properties: {
            [CANONICAL.keywordIdeas.status]: {
              type: 'status',
              status: { name: '검색 중' },
            },
          } as Parameters<typeof notion.pages.update>[0]['properties'],
        });

        await paceYoupdRest();
        const body: Record<string, unknown> = {
          keyword: idea.keyword,
          max_results: 50,
          max_total_results: resolvedResultsPerKeyword,
        };
        const env = await youpdRestJson<{
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
        }>('/api/youpd/rest/search/keyword', {
          method: 'POST',
          body: JSON.stringify(body),
        });

        const collected = ptDateYmd();
        const channelPageById = new Map<string, string>();
        for (const ch of env.data.channels) {
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
        }
        const videoPageIds: string[] = [];
        for (const v of env.data.videos) {
          const chPage = channelPageById.get(v.channelId);
          if (!chPage) continue;
          const row = await upsertVideoRow(
            notion,
            videosDs,
            videoRowFromApi(v),
            chPage,
            collected,
          );
          videoPageIds.push(row.pageId);
        }

        const kw = await upsertKeywordRow(
          notion,
          keywordsDs,
          idea.keyword.trim(),
          collected,
        );
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

        await mergeRelationPropertyByName(
          notion,
          ideasSchema,
          idea.pageId,
          CANONICAL.keywordIdeas.trackingKeywordsRelation,
          [kw.pageId],
        );

        const slot = plannedSlot(
          idea.pageId,
          idea.trackingPeriod,
          idea.trackingSlot,
          forceRebalance,
        );
        const successProperties: Record<string, unknown> = {
          [CANONICAL.keywordIdeas.searchCount]: {
            type: 'number',
            number: idea.searchCount + 1,
          },
          [CANONICAL.keywordIdeas.lastSearchedAt]: {
            type: 'date',
            date: { start: collected },
          },
          [CANONICAL.keywordIdeas.status]: {
            type: 'status',
            status: { name: '검색 완료' },
          },
        };
        // Only write trackingSlot when we have a value: clearing it would
        // accidentally promote 수동/중지 ideas back into the daily catch-up.
        if (slot != null) {
          successProperties[CANONICAL.keywordIdeas.trackingSlot] = {
            type: 'number',
            number: slot,
          };
        }
        await notion.pages.update({
          page_id: idea.pageId,
          properties:
            successProperties as Parameters<typeof notion.pages.update>[0]['properties'],
        });

        succeeded += 1;
        ideaReports.push({
          page_id: idea.pageId,
          keyword: idea.keyword,
          planned_slot: slot,
          planned_period: idea.trackingPeriod,
          status: 'ok',
          error: null,
        });
      } catch (e) {
        failed += 1;
        const message = e instanceof Error ? e.message : String(e);
        try {
          await notion.pages.update({
            page_id: idea.pageId,
            properties: {
              [CANONICAL.keywordIdeas.status]: {
                type: 'status',
                status: { name: '검토' },
              },
            } as Parameters<typeof notion.pages.update>[0]['properties'],
          });
        } catch {
          // Swallow status-revert failure so we still report the original error.
        }
        ideaReports.push({
          page_id: idea.pageId,
          keyword: idea.keyword,
          planned_slot: plannedSlot(
            idea.pageId,
            idea.trackingPeriod,
            idea.trackingSlot,
            forceRebalance,
          ),
          planned_period: idea.trackingPeriod,
          status: 'error',
          error: message,
        });
      }
    }

    return {
      ok: failed === 0,
      enabled: true,
      mode: runMode,
      processed: dueRows.length,
      succeeded,
      failed,
      dry_run: false,
      results_per_keyword: resolvedResultsPerKeyword,
      expected_quota_units: dueRows.length * unitsPerKeyword,
      slot_distribution: buildDistribution(dueRows),
      ideas: ideaReports,
    };
  },
});
