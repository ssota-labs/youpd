import { Worker, type CapabilityContext } from '@notionhq/workers';
import * as Builder from '@notionhq/workers/builder';
import { j } from '@notionhq/workers/schema-builder';
import * as Schema from '@notionhq/workers/schema';

import { youpdRestJson } from './lib/youpd-rest.js';

const worker = new Worker();
export default worker;

const apiPacer = worker.pacer('youpdRest', {
  allowedRequests: 24,
  intervalMs: 60_000,
});

const videosDb = worker.database('videosWorker', {
  type: 'managed',
  initialTitle: 'YouPD Videos (worker)',
  primaryKeyProperty: 'videoId',
  schema: {
    properties: {
      제목: Schema.title(),
      videoId: Schema.richText(),
      channelId: Schema.richText(),
      channelTitle: Schema.richText(),
      '조회수(최신)': Schema.number('number_with_commas'),
      '좋아요(최신)': Schema.number('number_with_commas'),
      '댓글수(최신)': Schema.number('number_with_commas'),
      게시일: Schema.date(),
      영상링크: Schema.url(),
    },
  },
});

const snapshotsDb = worker.database('videoSnapshotsWorker', {
  type: 'managed',
  initialTitle: 'YouPD Snapshots (worker)',
  primaryKeyProperty: 'rowKey',
  schema: {
    properties: {
      rowKey: Schema.richText(),
      videoId: Schema.richText(),
      snapshotDate: Schema.date(),
      views: Schema.number('number_with_commas'),
      likes: Schema.number('number_with_commas'),
      comments: Schema.number('number_with_commas'),
    },
  },
});

const commentsDb = worker.database('commentsWorker', {
  type: 'managed',
  initialTitle: 'YouPD Comments (worker)',
  primaryKeyProperty: 'commentId',
  schema: {
    properties: {
      commentId: Schema.richText(),
      videoId: Schema.richText(),
      text: Schema.richText(),
      likeCount: Schema.number('number'),
      publishedAt: Schema.date(),
    },
  },
});

const hotDailyDb = worker.database('hotVideoDailyWorker', {
  type: 'managed',
  initialTitle: 'YouPD Hot Video Daily (worker)',
  primaryKeyProperty: 'rowKey',
  schema: {
    properties: {
      rowKey: Schema.richText(),
      videoId: Schema.richText(),
      rank: Schema.number('number'),
      regionCode: Schema.richText(),
      title: Schema.title(),
    },
  },
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

function videoChange(v: VideoLike) {
  return {
    type: 'upsert' as const,
    key: v.videoId,
    properties: {
      제목: Builder.title(v.title),
      videoId: Builder.richText(v.videoId),
      channelId: Builder.richText(v.channelId),
      channelTitle: Builder.richText(v.channelTitle),
      '조회수(최신)': Builder.number(v.views ?? 0),
      '좋아요(최신)': Builder.number(v.likes ?? 0),
      '댓글수(최신)': Builder.number(v.comments ?? 0),
      게시일: Builder.date(v.publishedAt.slice(0, 10)),
      영상링크: Builder.url(v.url),
    },
  };
}

function envList(name: string): string[] {
  return (process.env[name] ?? '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
}

type NotionPageLike = {
  properties?: Record<string, unknown>;
};

type DailySnapshotsState = {
  cursor?: string;
};

const TRACKED_VIDEO_ID_PROPERTIES = [
  'videoId',
  'Video ID',
  '영상 ID',
  '영상ID',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function propertyText(property: unknown): string {
  if (!isRecord(property)) return '';
  const type = typeof property.type === 'string' ? property.type : undefined;
  if (!type) return '';
  const value = property[type];

  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        isRecord(item) && typeof item.plain_text === 'string'
          ? item.plain_text
          : '',
      )
      .join('')
      .trim();
  }

  return '';
}

function videoIdFromPage(page: unknown): string | null {
  if (!isRecord(page)) return null;
  const properties = (page as NotionPageLike).properties;
  if (!properties) return null;

  for (const name of TRACKED_VIDEO_ID_PROPERTIES) {
    const id = propertyText(properties[name]);
    if (id) return id;
  }

  return null;
}

async function trackedVideoIdsFromNotion(
  { notion }: CapabilityContext,
  cursor?: string,
): Promise<{ ids: string[]; nextCursor?: string }> {
  const dataSourceId =
    process.env.TRACKED_VIDEOS_DATA_SOURCE_ID ??
    process.env.TRACKED_VIDEOS_DATABASE_ID;
  if (!dataSourceId) {
    throw new Error(
      'TRACKED_VIDEOS_DATA_SOURCE_ID is required for dailySnapshots.',
    );
  }

  const response = await notion.dataSources.query({
    data_source_id: dataSourceId,
    page_size: 100,
    ...(cursor ? { start_cursor: cursor } : {}),
  });

  const ids = Array.from(
    new Set(
      response.results
        .map(videoIdFromPage)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  return {
    ids,
    nextCursor: response.next_cursor ?? undefined,
  };
}

worker.sync('videosByKeyword', {
  database: videosDb,
  mode: 'incremental',
  schedule: '30m',
  execute: async (state: { keywordIndex?: number } | undefined) => {
    const keywords = envList('SYNC_KEYWORDS');
    const i = state?.keywordIndex ?? 0;
    if (keywords.length === 0 || i >= keywords.length) {
      return { changes: [], hasMore: false };
    }
    await apiPacer.wait();
    const keyword = keywords[i]!;
    const env = await youpdRestJson<{
      keyword: string;
      videos: VideoLike[];
      channels: { channelId: string; title: string }[];
    }>('/api/youpd/rest/search/keyword', {
      method: 'POST',
      body: JSON.stringify({ keyword, max_results: 50 }),
    });
    const changes = env.data.videos.map(videoChange);
    const hasMore = i + 1 < keywords.length;
    return {
      changes,
      hasMore,
      nextState: hasMore ? { keywordIndex: i + 1 } : undefined,
    };
  },
});

worker.sync('channelAllVideos', {
  database: videosDb,
  mode: 'incremental',
  schedule: 'manual',
  execute: async (state: {
    token?: string;
    uploadsPlaylistId?: string;
    channelId?: string;
  } | undefined) => {
    const channelId = process.env.SYNC_CHANNEL_ID ?? state?.channelId;
    if (!channelId) {
      return { changes: [], hasMore: false };
    }
    await apiPacer.wait();
    const params = new URLSearchParams();
    if (state?.uploadsPlaylistId) {
      params.set('uploads_playlist_id', state.uploadsPlaylistId);
    }
    if (state?.token) params.set('playlist_page_token', state.token);
    const q = params.toString();
    const path = `/api/youpd/rest/channels/${encodeURIComponent(channelId)}/videos${q ? `?${q}` : ''}`;
    const env = await youpdRestJson<{
      channel: {
        channelId: string;
        title: string;
        uploadsPlaylistId: string | null;
      } | null;
      videos: VideoLike[];
      uploads_playlist_id: string | null;
      playlist_next_page_token: string | null;
      playlist_done: boolean;
    }>(path);
    const changes = env.data.videos.map(videoChange);
    const nextToken = env.data.playlist_next_page_token;
    const uploadsId =
      env.data.uploads_playlist_id ??
      state?.uploadsPlaylistId ??
      undefined;
    const hasMore = Boolean(nextToken) && !env.data.playlist_done;
    return {
      changes,
      hasMore,
      nextState: hasMore
        ? {
            token: nextToken ?? undefined,
            uploadsPlaylistId: uploadsId,
            channelId,
          }
        : undefined,
    };
  },
});

worker.sync('dailySnapshots', {
  database: snapshotsDb,
  mode: 'incremental',
  schedule: '1d',
  execute: async (
    state: DailySnapshotsState | undefined,
    context: CapabilityContext,
  ) => {
    const { ids, nextCursor } = await trackedVideoIdsFromNotion(
      context,
      state?.cursor,
    );

    if (ids.length === 0) {
      return {
        changes: [],
        hasMore: Boolean(nextCursor),
        nextState: nextCursor ? { cursor: nextCursor } : undefined,
      };
    }

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
      body: JSON.stringify({ video_ids: ids }),
    });
    const changes = env.data.snapshots.map((s) => {
      const rowKey = `${s.video_id}::${s.snapshot_date}`;
      return {
        type: 'upsert' as const,
        key: rowKey,
        properties: {
          rowKey: Builder.richText(rowKey),
          videoId: Builder.richText(s.video_id),
          snapshotDate: Builder.date(s.snapshot_date),
          views: Builder.number(s.views ?? 0),
          likes: Builder.number(s.likes ?? 0),
          comments: Builder.number(s.comments ?? 0),
        },
      };
    });
    return {
      changes,
      hasMore: Boolean(nextCursor),
      nextState: nextCursor ? { cursor: nextCursor } : undefined,
    };
  },
});

worker.sync('hotVideoDaily', {
  database: hotDailyDb,
  mode: 'incremental',
  schedule: '1d',
  execute: async () => {
    const region = process.env.HOT_REGION ?? 'KR';
    await apiPacer.wait();
    const env = await youpdRestJson<{
      videos: VideoLike[];
      region_code: string;
    }>(
      `/api/youpd/rest/trending/hot-chart?region_code=${encodeURIComponent(region)}&limit=50`,
    );
    const changes = env.data.videos.map((v, idx) => {
      const rowKey = `${env.data.region_code ?? region}::${v.videoId}`;
      return {
        type: 'upsert' as const,
        key: rowKey,
        properties: {
          rowKey: Builder.richText(rowKey),
          videoId: Builder.richText(v.videoId),
          rank: Builder.number(idx + 1),
          regionCode: Builder.richText(env.data.region_code ?? region),
          title: Builder.title(v.title),
        },
      };
    });
    return { changes, hasMore: false };
  },
});

worker.sync('videoComments', {
  database: commentsDb,
  mode: 'incremental',
  schedule: 'manual',
  execute: async () => {
    const videoId = process.env.COMMENT_VIDEO_ID;
    if (!videoId) return { changes: [], hasMore: false };
    await apiPacer.wait();
    const env = await youpdRestJson<{
      video_id: string;
      top_comments: {
        commentId: string;
        videoId: string;
        text: string;
        likeCount: number;
        publishedAt: string;
      }[];
    }>(
      `/api/youpd/rest/videos/${encodeURIComponent(videoId)}/comments?top_n=50`,
    );
    const changes = env.data.top_comments.map((c) => ({
      type: 'upsert' as const,
      key: c.commentId,
      properties: {
        commentId: Builder.richText(c.commentId),
        videoId: Builder.richText(c.videoId),
        text: Builder.richText(c.text),
        likeCount: Builder.number(c.likeCount),
        publishedAt: Builder.date(c.publishedAt.slice(0, 10)),
      },
    }));
    return { changes, hasMore: false };
  },
});

worker.tool('videosByKeyword', {
  title: 'Videos by keyword — instant preview (sync twin)',
  description:
    'Same REST path as sync `videosByKeyword`: keyword 검색 결과 요약만 반환한다. 관리형 Videos DB 적재는同名 sync 스케줄/수동 실행.',
  schema: j.object({
    keyword: j.string().describe('YouTube search query.'),
    max_results: j.number().describe('1–50 results.').nullable(),
  }),
  hints: { readOnlyHint: true },
  execute: async ({ keyword, max_results }) => {
    await apiPacer.wait();
    const env = await youpdRestJson<{
      videos: { title: string; videoId: string }[];
      channels: { title: string }[];
    }>('/api/youpd/rest/search/keyword', {
      method: 'POST',
      body: JSON.stringify({
        keyword,
        max_results: max_results ?? 50,
      }),
    });
    return {
      video_count: env.data.videos.length,
      channel_count: env.data.channels.length,
      preview_titles: env.data.videos.slice(0, 5).map((v) => v.title),
      ...(env.meta.jobId ? { quota_session_id: env.meta.jobId } : {}),
    };
  },
});

worker.tool('channelAllVideos', {
  title: 'Channel all videos — instant preview (sync twin)',
  description:
    'REST `GET …/channels/{id}/videos?all=true` 한 번으로 채널 업로드 목록을 가져와 요약만 반환한다. 관리형 DB 대량 적재는同名 sync.',
  schema: j.object({
    channel_id: j.string().describe('YouTube channel id (UC...).'),
    max_videos: j
      .number()
      .describe('Optional cap (default 웹 라우트 기본값과 동일).')
      .nullable(),
  }),
  hints: { readOnlyHint: true },
  execute: async ({ channel_id, max_videos }) => {
    await apiPacer.wait();
    const params = new URLSearchParams({ all: 'true' });
    if (max_videos != null) params.set('max_videos', String(max_videos));
    const env = await youpdRestJson<{
      channel: { title: string; channelId: string } | null;
      videos: VideoLike[];
    }>(
      `/api/youpd/rest/channels/${encodeURIComponent(channel_id)}/videos?${params.toString()}`,
    );
    return {
      channel_title: env.data.channel?.title ?? null,
      video_count: env.data.videos.length,
      preview_titles: env.data.videos.slice(0, 5).map((v) => v.title),
      ...(env.meta.jobId ? { quota_session_id: env.meta.jobId } : {}),
    };
  },
});

worker.tool('videoComments', {
  title: 'Video comments — instant preview (sync twin)',
  description:
    'REST로 영상 TOP-N 댓글을 조회해 개수·상위 일부 스니펫만 반환한다. 관리형 Comments DB 적재는同名 sync.',
  schema: j.object({
    video_id: j.string().describe('YouTube video id.'),
    top_n: j.number().describe('1–100, 기본 웹 라우트와 동일.').nullable(),
  }),
  hints: { readOnlyHint: true },
  execute: async ({ video_id, top_n }) => {
    await apiPacer.wait();
    const qs =
      top_n != null
        ? `?top_n=${encodeURIComponent(String(top_n))}`
        : '';
    const env = await youpdRestJson<{
      video_id: string;
      top_comments: {
        commentId: string;
        text: string;
        likeCount: number;
      }[];
      comments_disabled: boolean;
    }>(
      `/api/youpd/rest/videos/${encodeURIComponent(video_id)}/comments${qs}`,
    );
    const tops = env.data.top_comments;
    return {
      video_id: env.data.video_id,
      comments_disabled: env.data.comments_disabled,
      comment_count: tops.length,
      top_preview: tops.slice(0, 5).map((c) => ({
        likes: c.likeCount,
        snippet:
          c.text.length > 160 ? `${c.text.slice(0, 157)}...` : c.text,
      })),
      ...(env.meta.jobId ? { quota_session_id: env.meta.jobId } : {}),
    };
  },
});
