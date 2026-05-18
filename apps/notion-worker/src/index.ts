import { Worker } from '@notionhq/workers';

import { j } from '@notionhq/workers/schema-builder';
import type { CapabilityContext } from '@notionhq/workers';

import { createLocalTokenBucket } from './lib/pacer-local-fallback.js';
import { normalizeNotionPageId } from './lib/notion-id.js';
import { youpdRestJson } from './lib/youpd-rest.js';
import { CANONICAL, validateCanonicalSchema, type TableKey } from './lib/schema.js';
import { plannedSlot } from './lib/tracking-slots.js';
import {
  chunks,
  collectChannelIdsFromDataSource,
  collectVideoIdsFromDataSource,
  findPageIdByTitleEquals,
  findPageIdsByRichTextIn,
  findPageIdsByTitleEquals,
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
  upsertSelectedVideoCandidateRow,
  upsertSnapshotRow,
  upsertVideoRow,
  writeChannelRow,
  writeVideoRow,
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
  { env: 'YOUPD_VIDEO_CANDIDATES_DATA_SOURCE_ID', table: 'selectedVideoCandidates' },
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

worker.tool('saveVideoCandidatesToNotion', {
  title: 'Save selected video candidates to Notion',
  description:
    'v0.11 curation capability: accepts small video ids + context, fetches canonical candidate details from YouPD REST, and upserts selected video candidate rows into Notion.',
  schema: j.object({
    videoIds: j
      .array(j.string())
      .describe('Selected YouTube video ids. Keep this small; max 20 recommended.'),
    useCase: j.string().describe('Selection context, e.g. key_content_research.'),
    keyword: j.string().describe('Keyword or topic that led to this selection.'),
    note: j.string().nullable().describe('Short agent/user note explaining why saved.'),
  }),
  outputSchema: j.object({
    requested: j.number(),
    saved: j.number(),
    created: j.number(),
    updated: j.number(),
    missing_video_ids: j.array(j.string()),
  }),
  execute: async ({ videoIds, useCase, keyword, note }, { notion }) => {
    const candidateDs = requireEnv('YOUPD_VIDEO_CANDIDATES_DATA_SOURCE_ID');
    const videosDs = requireEnv('YOUPD_VIDEOS_DATA_SOURCE_ID');

    const candidateSchema = await dataSourceSchema(notion, candidateDs);
    const videosSchema = await dataSourceSchema(notion, videosDs);
    const cv = validateCanonicalSchema('selectedVideoCandidates', candidateSchema);
    if (!cv.ok) throw new Error(cv.message);
    const vv = validateCanonicalSchema('videos', videosSchema);
    if (!vv.ok) throw new Error(vv.message);

    const uniqueVideoIds = [...new Set(videoIds.map((id) => id.trim()).filter(Boolean))];
    const cappedVideoIds = uniqueVideoIds.slice(0, 20);
    await paceYoupdRest();
    const env = await youpdRestJson<{
      videos: {
        videoId: string;
        title: string;
        videoUrl: string;
        performance: { ratio: number | null; grade: string };
        contribution: { ratio: number | null; grade: string };
        lengthAdjustment: { adjustedScore: number | null };
      }[];
    }>('/api/youpd/rest/query/video-candidates', {
      method: 'POST',
      body: JSON.stringify({ videoIds: cappedVideoIds }),
    });

    const found = new Set(env.data.videos.map((video) => video.videoId));
    const missing = cappedVideoIds.filter((id) => !found.has(id));
    const savedYmd = ptDateYmd();
    const cleanKeyword = keyword.trim();
    const cleanUseCase = useCase.trim() || 'general';
    let created = 0;
    let updated = 0;

    for (const video of env.data.videos) {
      const videoPageId = await resolveVideoPageId(notion, videosDs, video.videoId);
      const kind = await upsertSelectedVideoCandidateRow(notion, candidateDs, {
        rowKey: `${cleanKeyword}::${cleanUseCase}::${video.videoId}`,
        title: video.title,
        videoId: video.videoId,
        videoPageId,
        keyword: cleanKeyword,
        useCase: cleanUseCase,
        note: note?.trim() || null,
        performanceRatio: video.performance.ratio,
        performanceGrade: video.performance.grade,
        contributionRatio: video.contribution.ratio,
        contributionGrade: video.contribution.grade,
        lengthAdjustedScore: video.lengthAdjustment.adjustedScore,
        videoUrl: video.videoUrl,
        savedYmd,
      });
      if (kind === 'created') created += 1;
      else updated += 1;
    }

    return {
      requested: cappedVideoIds.length,
      saved: env.data.videos.length,
      created,
      updated,
      missing_video_ids: missing,
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

// ---------------------------------------------------------------------------
// Supabase-staged keyword harvest flow.
//
// Replaces the legacy `trackKeywordIdeasDue` which tried to do a full keyword
// search + Notion upsert pass in one capability call. That model breaks the
// 60s Notion Worker timeout for any keyword with >50 results because Notion
// API enforces ~3 req/sec.
//
// The flow is now split into two tools:
//
//   harvestKeywordIdea     — POST /api/youpd/rest/harvests
//                            Fetches YouTube once and parks 300 videos in
//                            canonical Supabase tables. ~9s.
//
//   publishHarvestToNotion — Drains the harvest into Notion in chunks. Each
//                            invocation handles ~`batch_size` items (default
//                            30) and reports `has_more`. The Notion Custom
//                            Agent loops until `has_more === false`, at which
//                            point this tool finalizes (merges relations,
//                            stamps Keyword Ideas status, calls /finalize).
// ---------------------------------------------------------------------------

function readTitleText(page: unknown, propertyName: string): string {
  if (!page || typeof page !== 'object' || !('properties' in page)) return '';
  const props = (page as { properties: Record<string, unknown> }).properties;
  const prop = props[propertyName];
  if (!prop || typeof prop !== 'object' || !('type' in prop)) return '';
  if ((prop as { type: string }).type !== 'title') return '';
  const title = (prop as { title?: Array<{ plain_text?: string }> }).title;
  if (!Array.isArray(title)) return '';
  return title.map((t) => t?.plain_text ?? '').join('').trim();
}

function readNumber(page: unknown, propertyName: string): number {
  if (!page || typeof page !== 'object' || !('properties' in page)) return 0;
  const props = (page as { properties: Record<string, unknown> }).properties;
  const prop = props[propertyName];
  if (!prop || typeof prop !== 'object' || !('type' in prop)) return 0;
  if ((prop as { type: string }).type !== 'number') return 0;
  const n = (prop as { number?: number | null }).number;
  return typeof n === 'number' ? n : 0;
}

function readNumberOrNull(page: unknown, propertyName: string): number | null {
  if (!page || typeof page !== 'object' || !('properties' in page)) return null;
  const props = (page as { properties: Record<string, unknown> }).properties;
  const prop = props[propertyName];
  if (!prop || typeof prop !== 'object' || !('type' in prop)) return null;
  if ((prop as { type: string }).type !== 'number') return null;
  const n = (prop as { number?: number | null }).number;
  return typeof n === 'number' ? n : null;
}

function readSelectName(page: unknown, propertyName: string): string | null {
  if (!page || typeof page !== 'object' || !('properties' in page)) return null;
  const props = (page as { properties: Record<string, unknown> }).properties;
  const prop = props[propertyName];
  if (!prop || typeof prop !== 'object' || !('type' in prop)) return null;
  if ((prop as { type: string }).type !== 'select') return null;
  const select = (prop as { select?: { name?: string } | null }).select;
  return select?.name ?? null;
}

type HarvestRestEnvelope = {
  harvest_id: string;
  keyword: string;
  total_videos: number;
  total_channels: number;
  units_consumed: number;
  search_pages: number | null;
  quota_session_id: string | null;
};

type HarvestStatusRestEnvelope = {
  id: string;
  keyword: string;
  keyword_idea_page_id: string;
  status: string;
  total_videos: number;
  total_channels: number;
  unpublished_videos: number;
  unpublished_channels: number;
  finalized: boolean;
  notion_keyword_page_id: string | null;
  created_at: string;
  finished_at: string | null;
};

type HarvestVideoItem = {
  video_id: string;
  position: number;
  channel_id: string;
  title: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  duration_sec: number | null;
  published_at: string | null;
  url: string | null;
  notion_page_id: string | null;
};

type HarvestChannelItem = {
  channel_id: string;
  title: string | null;
  subscriber_count: number | null;
  view_count: number | null;
  video_count: number | null;
  published_at: string | null;
  url: string | null;
  notion_page_id: string | null;
};

type HarvestItemsResponse = {
  harvest_id: string;
  kind: 'video' | 'channel';
  videos?: HarvestVideoItem[];
  channels?: HarvestChannelItem[];
  synced_video_page_ids?: string[];
  synced_channel_page_ids?: string[];
};

worker.tool('harvestKeywordIdea', {
  title: 'Harvest a Keyword Idea into Supabase',
  description:
    "Identifies a Keyword Ideas row (by page id OR by the row's title text), sets 상태=검색 중, calls POST /api/youpd/rest/harvests to fetch up to results_per_keyword (default 300, max 500) videos from YouTube, and stages them in canonical Supabase videos / channels + search_harvests tables. Returns harvest_id which the agent passes to publishHarvestToNotion. This tool itself never writes videos/channels to Notion — the publish tool drains them in chunks under the 60s capability ceiling. Pass either keyword_idea_page_id (any form: dashed UUID, 32-char hex, or any notion.so page URL) OR keyword (the row's title text). If both are passed, keyword_idea_page_id wins. If keyword resolves to more than one row the call fails with an ambiguity error.",
  schema: j.object({
    keyword_idea_page_id: j
      .string()
      .describe(
        'Optional — Notion Keyword Ideas page identifier. Accepts dashed UUID, 32-char hex, or any notion.so URL containing the id.',
      )
      .nullable(),
    keyword: j
      .string()
      .describe(
        "Optional alternative — the Keyword Ideas row's title text (e.g. '복지용구 반품 교환'). The worker queries the Keyword Ideas DB by title equals.",
      )
      .nullable(),
    results_per_keyword: j
      .number()
      .describe('1–500, default 300.')
      .nullable(),
  }),
  outputSchema: j.object({
    harvest_id: j.string(),
    keyword: j.string(),
    total_videos: j.number(),
    total_channels: j.number(),
    units_consumed: j.number(),
    search_pages: j.number().nullable(),
    quota_session_id: j.string().nullable(),
  }),
  execute: async (
    {
      keyword_idea_page_id: rawIdeaId,
      keyword: keywordTitleInput,
      results_per_keyword,
    },
    { notion },
  ) => {
    const keywordIdeasDs = requireEnv('YOUPD_KEYWORD_IDEAS_DATA_SOURCE_ID');
    // Schema sanity — agent gets a clear error if env points at the wrong DB.
    const ideaSchema = await dataSourceSchema(notion, keywordIdeasDs);
    const ideaCheck = validateCanonicalSchema('keywordIdeas', ideaSchema);
    if (!ideaCheck.ok) throw new Error(ideaCheck.message);

    // Resolve the Keyword Ideas row. Either side of (page id, title) is
    // sufficient; if both are supplied we trust the explicit page id.
    let keyword_idea_page_id: string;
    if (rawIdeaId && rawIdeaId.trim().length > 0) {
      keyword_idea_page_id = normalizeNotionPageId(rawIdeaId);
    } else if (keywordTitleInput && keywordTitleInput.trim().length > 0) {
      const title = keywordTitleInput.trim();
      const matches = await findPageIdsByTitleEquals(
        notion,
        keywordIdeasDs,
        CANONICAL.keywordIdeas.title,
        title,
        5,
      );
      if (matches.length === 0) {
        throw new Error(
          `No Keyword Ideas row found with title "${title}". ` +
            'Pass keyword_idea_page_id (page URL or UUID) if the title contains hidden whitespace or emoji prefixes.',
        );
      }
      if (matches.length > 1) {
        throw new Error(
          `Multiple Keyword Ideas rows match title "${title}" (${matches.length} found). ` +
            'Pass keyword_idea_page_id (page URL or UUID) to disambiguate.',
        );
      }
      keyword_idea_page_id = matches[0]!;
    } else {
      throw new Error(
        'Provide either keyword_idea_page_id (URL/UUID) or keyword (row title).',
      );
    }

    const ideaPage = await notion.pages.retrieve({
      page_id: keyword_idea_page_id,
    });
    const keyword = readTitleText(ideaPage, CANONICAL.keywordIdeas.title);
    if (!keyword) {
      throw new Error(
        `Keyword Ideas row ${keyword_idea_page_id} has no keyword title.`,
      );
    }

    // Flip Notion status to '검색 중' so humans see the row is in flight.
    // Tool B will move it to '검색 완료' on finalize.
    await notion.pages.update({
      page_id: keyword_idea_page_id,
      properties: {
        [CANONICAL.keywordIdeas.status]: {
          type: 'status',
          status: { name: '검색 중' },
        },
      } as Parameters<typeof notion.pages.update>[0]['properties'],
    });

    const env = await youpdRestJson<HarvestRestEnvelope>(
      '/api/youpd/rest/harvests',
      {
        method: 'POST',
        body: JSON.stringify({
          keyword,
          keyword_idea_page_id,
          results_per_keyword:
            results_per_keyword == null ? 300 : results_per_keyword,
        }),
      },
    );

    return {
      harvest_id: env.data.harvest_id,
      keyword: env.data.keyword,
      total_videos: env.data.total_videos,
      total_channels: env.data.total_channels,
      units_consumed: env.data.units_consumed,
      search_pages: env.data.search_pages,
      quota_session_id: env.data.quota_session_id,
    };
  },
});

worker.tool('publishHarvestToNotion', {
  title: 'Publish a harvest into Notion (chunked)',
  description:
    'Drains a search_harvests session into Notion in chunks. Each call writes up to batch_size (default 30) channels and batch_size videos, then reports has_more. Re-invoke while has_more === true. On the call that empties the harvest, finalizes by upserting the Keywords row, merging Keywords↔Videos / Keywords↔Channels relations, linking the Keyword Ideas row to the Keywords row, updating Keyword Ideas 상태=검색 완료 / 마지막 검색일 / 검색 횟수 / 트래킹 슬롯, and stamping the harvest published in Supabase. Idempotent: a second finalize call is a no-op.',
  schema: j.object({
    harvest_id: j.string(),
    batch_size: j.number().describe('Per-call chunk size, 1–100, default 30.').nullable(),
  }),
  outputSchema: j.object({
    harvest_id: j.string(),
    processed_videos: j.number(),
    processed_channels: j.number(),
    has_more: j.boolean(),
    finalized: j.boolean(),
    keyword_idea_page_id: j.string().nullable(),
    keyword_page_id: j.string().nullable(),
    remaining_unpublished_videos: j.number(),
    remaining_unpublished_channels: j.number(),
  }),
  execute: async ({ harvest_id, batch_size }, { notion }) => {
    const batch =
      batch_size != null && batch_size > 0 ? Math.min(batch_size, 100) : 30;
    const channelsDs = requireEnv('YOUPD_CHANNELS_DATA_SOURCE_ID');
    const videosDs = requireEnv('YOUPD_VIDEOS_DATA_SOURCE_ID');
    const keywordsDs = requireEnv('YOUPD_KEYWORDS_DATA_SOURCE_ID');
    const keywordIdeasDs = requireEnv('YOUPD_KEYWORD_IDEAS_DATA_SOURCE_ID');

    // Validate canonical schemas up-front so we fail fast with a clear error.
    const cs = await dataSourceSchema(notion, channelsDs);
    const vs = await dataSourceSchema(notion, videosDs);
    const ks = await dataSourceSchema(notion, keywordsDs);
    const ideaSchema = await dataSourceSchema(notion, keywordIdeasDs);
    const cCheck = validateCanonicalSchema('channels', cs);
    if (!cCheck.ok) throw new Error(cCheck.message);
    const vCheck = validateCanonicalSchema('videos', vs);
    if (!vCheck.ok) throw new Error(vCheck.message);
    const kCheck = validateCanonicalSchema('keywords', ks);
    if (!kCheck.ok) throw new Error(kCheck.message);
    const iCheck = validateCanonicalSchema('keywordIdeas', ideaSchema);
    if (!iCheck.ok) throw new Error(iCheck.message);

    const collected = ptDateYmd();
    let processedChannels = 0;
    let processedVideos = 0;

    // === 1. Channels chunk ===
    // Drain channels first because Videos rows relate to the Channels page
    // id; a video can only be linked once its channel row exists.
    {
      const env = await youpdRestJson<HarvestItemsResponse>(
        `/api/youpd/rest/harvests/${harvest_id}/items?kind=channel&size=${batch}`,
      );
      const list = env.data.channels ?? [];
      if (list.length > 0) {
        // Batch lookup: resolve any channels we don't already have a cached
        // page id for, in ONE Notion query instead of N per-row finds.
        const unresolved = list
          .filter((c) => !c.notion_page_id)
          .map((c) => c.channel_id);
        const lookup =
          unresolved.length > 0
            ? await findPageIdsByRichTextIn(
                notion,
                channelsDs,
                CANONICAL.channels.channelId,
                unresolved,
              )
            : new Map<string, string>();
        const marks: {
          kind: 'channel';
          id: string;
          notion_page_id: string;
        }[] = [];
        for (const ch of list) {
          const existing =
            ch.notion_page_id ?? lookup.get(ch.channel_id) ?? null;
          const w = await writeChannelRow(
            notion,
            channelsDs,
            {
              channelId: ch.channel_id,
              title: ch.title ?? '',
              subscriberCount: ch.subscriber_count,
              viewCount: ch.view_count,
              videoCount: ch.video_count,
              publishedAt: ch.published_at ?? '',
              avgLikes: null,
              url: ch.url ?? '',
            },
            existing,
          );
          marks.push({
            kind: 'channel',
            id: ch.channel_id,
            notion_page_id: w.pageId,
          });
          processedChannels += 1;
        }
        if (marks.length > 0) {
          await youpdRestJson(
            `/api/youpd/rest/harvests/${harvest_id}/mark-published`,
            {
              method: 'POST',
              body: JSON.stringify({ items: marks }),
            },
          );
        }
      }
    }

    // === 2. Videos chunk ===
    {
      const env = await youpdRestJson<HarvestItemsResponse>(
        `/api/youpd/rest/harvests/${harvest_id}/items?kind=video&size=${batch}`,
      );
      const list = env.data.videos ?? [];
      if (list.length > 0) {
        // Channel page ids: we drained channels above so they should all be
        // in Supabase now, but the items endpoint returns canonical video rows
        // joined with their channel_id only. Look up the matching channel
        // pages in one batch query.
        const chanIds = Array.from(new Set(list.map((v) => v.channel_id)));
        const channelLookup = await findPageIdsByRichTextIn(
          notion,
          channelsDs,
          CANONICAL.channels.channelId,
          chanIds,
        );

        const unresolved = list
          .filter((v) => !v.notion_page_id)
          .map((v) => v.video_id);
        const videoLookup =
          unresolved.length > 0
            ? await findPageIdsByRichTextIn(
                notion,
                videosDs,
                CANONICAL.videos.videoId,
                unresolved,
              )
            : new Map<string, string>();

        const marks: {
          kind: 'video';
          id: string;
          notion_page_id: string;
        }[] = [];
        for (const v of list) {
          const chPage = channelLookup.get(v.channel_id);
          if (!chPage) {
            // Channel for this video hasn't landed yet — leave junction
            // unpublished so the next invocation retries.
            continue;
          }
          const existing =
            v.notion_page_id ?? videoLookup.get(v.video_id) ?? null;
          const w = await writeVideoRow(
            notion,
            videosDs,
            {
              title: v.title ?? '',
              videoId: v.video_id,
              channelId: v.channel_id,
              channelTitle: '',
              publishedAt: v.published_at ?? '',
              views: v.views,
              likes: v.likes,
              comments: v.comments,
              url: v.url ?? '',
            },
            chPage,
            collected,
            existing,
          );
          marks.push({
            kind: 'video',
            id: v.video_id,
            notion_page_id: w.pageId,
          });
          processedVideos += 1;
        }
        if (marks.length > 0) {
          await youpdRestJson(
            `/api/youpd/rest/harvests/${harvest_id}/mark-published`,
            {
              method: 'POST',
              body: JSON.stringify({ items: marks }),
            },
          );
        }
      }
    }

    // === 3. Status check / decide whether to finalize ===
    const statusEnv = await youpdRestJson<HarvestStatusRestEnvelope>(
      `/api/youpd/rest/harvests/${harvest_id}`,
    );
    const remainingV = statusEnv.data.unpublished_videos;
    const remainingC = statusEnv.data.unpublished_channels;

    if (remainingV > 0 || remainingC > 0) {
      return {
        harvest_id,
        processed_videos: processedVideos,
        processed_channels: processedChannels,
        has_more: true,
        finalized: false,
        keyword_idea_page_id: statusEnv.data.keyword_idea_page_id,
        keyword_page_id: statusEnv.data.notion_keyword_page_id,
        remaining_unpublished_videos: remainingV,
        remaining_unpublished_channels: remainingC,
      };
    }

    if (statusEnv.data.finalized) {
      // Re-invocation after finalize — return cached page ids as a no-op.
      return {
        harvest_id,
        processed_videos: processedVideos,
        processed_channels: processedChannels,
        has_more: false,
        finalized: true,
        keyword_idea_page_id: statusEnv.data.keyword_idea_page_id,
        keyword_page_id: statusEnv.data.notion_keyword_page_id,
        remaining_unpublished_videos: 0,
        remaining_unpublished_channels: 0,
      };
    }

    // === 4. Finalize: relations + Keyword Ideas mark complete ===
    // Collect every synced Notion page id for this harvest so we can merge
    // Keywords-DB relations in one call per relation.
    const syncedEnv = await youpdRestJson<HarvestItemsResponse>(
      `/api/youpd/rest/harvests/${harvest_id}/items?kind=video&include_published=true&size=1`,
    );
    const videoPageIds = syncedEnv.data.synced_video_page_ids ?? [];
    const channelPageIds = syncedEnv.data.synced_channel_page_ids ?? [];

    const kw = await upsertKeywordRow(
      notion,
      keywordsDs,
      statusEnv.data.keyword.trim(),
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
      channelPageIds,
    );
    await mergeRelationPropertyByName(
      notion,
      ideaSchema,
      statusEnv.data.keyword_idea_page_id,
      CANONICAL.keywordIdeas.trackingKeywordsRelation,
      [kw.pageId],
    );

    // Recompute tracking slot (only writes when we have a value — clearing
    // it would accidentally promote 수동/중지 ideas back into the daily
    // catch-up filter).
    const ideaPage = await notion.pages.retrieve({
      page_id: statusEnv.data.keyword_idea_page_id,
    });
    const trackingPeriod = readSelectName(
      ideaPage,
      CANONICAL.keywordIdeas.trackingPeriod,
    );
    const existingSlot = readNumberOrNull(
      ideaPage,
      CANONICAL.keywordIdeas.trackingSlot,
    );
    const existingCount = readNumber(
      ideaPage,
      CANONICAL.keywordIdeas.searchCount,
    );
    const slot = plannedSlot(
      statusEnv.data.keyword_idea_page_id,
      trackingPeriod,
      existingSlot,
      false,
    );

    const props: Record<string, unknown> = {
      [CANONICAL.keywordIdeas.searchCount]: {
        type: 'number',
        number: existingCount + 1,
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
    if (slot != null) {
      props[CANONICAL.keywordIdeas.trackingSlot] = {
        type: 'number',
        number: slot,
      };
    }
    await notion.pages.update({
      page_id: statusEnv.data.keyword_idea_page_id,
      properties: props as Parameters<typeof notion.pages.update>[0]['properties'],
    });

    await youpdRestJson(
      `/api/youpd/rest/harvests/${harvest_id}/finalize`,
      {
        method: 'POST',
        body: JSON.stringify({ notion_keyword_page_id: kw.pageId }),
      },
    );

    return {
      harvest_id,
      processed_videos: processedVideos,
      processed_channels: processedChannels,
      has_more: false,
      finalized: true,
      keyword_idea_page_id: statusEnv.data.keyword_idea_page_id,
      keyword_page_id: kw.pageId,
      remaining_unpublished_videos: 0,
      remaining_unpublished_channels: 0,
    };
  },
});


