import 'server-only';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  BatchYouTubeVideosInputSchema,
  CaptureYouTubeMetricSnapshotsInputSchema,
  ChannelSnapshotsQueryInputSchema,
  ChannelSummaryInputSchema,
  FetchTrendingYouTubeVideosInputSchema,
  GetYouTubeChannelInputSchema,
  GetYouTubeVideoInputSchema,
  KeywordSummaryInputSchema,
  ListYouTubeChannelVideosInputSchema,
  ListYouTubeVideoCommentsInputSchema,
  QueryHotVideosInputSchema,
  SearchYouTubeVideosInputSchema,
  VideoSnapshotsQueryInputSchema,
} from '@youpd/api/youtube';
import { restGet, restPost } from './youpd-rest';

/** Short MCP tool descriptions (no progressive routing layer). */
const TOOL_SHORT_DESCRIPTIONS: Record<string, string> = {
  searchYouTubeVideos:
    'v0.12 REST wrapper: keyword search with optional canonical persistence.',
  getYouTubeVideo:
    'v0.12 REST wrapper: fetch one video detail by YouTube video ID.',
  batchYouTubeVideos:
    'v0.12 REST wrapper: fetch multiple video details by ID.',
  getYouTubeChannel:
    'v0.12 REST wrapper: fetch one channel detail and optional average refresh.',
  listYouTubeChannelVideos:
    'v0.12 REST wrapper: list a channel uploads catalog.',
  listYouTubeVideoComments:
    'v0.12 REST wrapper: list top comments for one video.',
  fetchTrendingYouTubeVideos:
    'v0.12 REST wrapper: fetch regional YouTube trending snapshot.',
  captureYouTubeMetricSnapshots:
    'v0.12 REST wrapper: capture video/channel metric snapshots.',
  queryHotVideos:
    'v0.12 REST wrapper: query persisted hot videos.',
  summarizeKeywordMarket:
    'v0.12 REST wrapper: summarize persisted keyword search results.',
  summarizeChannel:
    'v0.12 REST wrapper: summarize persisted channel metrics.',
  queryVideoMetricSnapshots:
    'v0.12 REST wrapper: query persisted video metric snapshots.',
  queryChannelMetricSnapshots:
    'v0.12 REST wrapper: query persisted channel metric snapshots.',
};

function shortDescription(name: string, fallback: string): string {
  return TOOL_SHORT_DESCRIPTIONS[name] ?? fallback;
}

// Register all MCP tools on a server instance. Called once per request by
// mcp-handler — the second-arg `extra` parameter carries `authInfo` from
// withMcpAuth, including the authenticated userId in `authInfo.extra.userId`.
export function registerTools(server: McpServer): void {
  registerYouTubeV012Tools(server);
}

function registerYouTubeV012Tools(server: McpServer): void {
  registerSimpleTool(server, {
    name: 'searchYouTubeVideos',
    title: 'Search YouTube videos through v0.12 REST',
    inputSchema: SearchYouTubeVideosInputSchema,
    handler: (params) =>
      restPost('/api/youpd/rest/youtube/search/videos', params),
    fallback:
      'v0.12 REST wrapper: keyword search with optional canonical persistence.',
    readOnly: false,
  });
  registerSimpleTool(server, {
    name: 'getYouTubeVideo',
    title: 'Get YouTube video detail through v0.12 REST',
    inputSchema: GetYouTubeVideoInputSchema,
    handler: ({ videoId, ...params }) =>
      restGet(`/api/youpd/rest/youtube/videos/${encodeURIComponent(videoId)}`, {
        ...params,
      }),
    fallback: 'v0.12 REST wrapper: fetch one video detail by YouTube video ID.',
  });
  registerSimpleTool(server, {
    name: 'batchYouTubeVideos',
    title: 'Batch-fetch YouTube videos through v0.12 REST',
    inputSchema: BatchYouTubeVideosInputSchema,
    handler: (params) =>
      restPost('/api/youpd/rest/youtube/videos/batch', params),
    fallback: 'v0.12 REST wrapper: fetch multiple video details by ID.',
  });
  registerSimpleTool(server, {
    name: 'getYouTubeChannel',
    title: 'Get YouTube channel through v0.12 REST',
    inputSchema: GetYouTubeChannelInputSchema,
    handler: ({ channelId, ...params }) =>
      restGet(
        `/api/youpd/rest/youtube/channels/${encodeURIComponent(channelId)}`,
        { ...params },
      ),
    fallback:
      'v0.12 REST wrapper: fetch one channel detail and optional average refresh.',
  });
  registerSimpleTool(server, {
    name: 'listYouTubeChannelVideos',
    title: 'List channel videos through v0.12 REST',
    inputSchema: ListYouTubeChannelVideosInputSchema,
    handler: ({ channelId, ...params }) =>
      restGet(
        `/api/youpd/rest/youtube/channels/${encodeURIComponent(channelId)}/videos`,
        { ...params },
      ),
    fallback: 'v0.12 REST wrapper: list a channel uploads catalog.',
  });
  registerSimpleTool(server, {
    name: 'listYouTubeVideoComments',
    title: 'List video comments through v0.12 REST',
    inputSchema: ListYouTubeVideoCommentsInputSchema,
    handler: ({ videoId, ...params }) =>
      restGet(
        `/api/youpd/rest/youtube/videos/${encodeURIComponent(videoId)}/comments`,
        { ...params },
      ),
    fallback: 'v0.12 REST wrapper: list top comments for one video.',
  });
  registerSimpleTool(server, {
    name: 'fetchTrendingYouTubeVideos',
    title: 'Fetch trending YouTube videos through v0.12 REST',
    inputSchema: FetchTrendingYouTubeVideosInputSchema,
    handler: (params) =>
      restPost('/api/youpd/rest/youtube/trending/videos', params),
    fallback: 'v0.12 REST wrapper: fetch regional YouTube trending snapshot.',
  });
  registerSimpleTool(server, {
    name: 'captureYouTubeMetricSnapshots',
    title: 'Capture YouTube metric snapshots through v0.12 REST',
    inputSchema: CaptureYouTubeMetricSnapshotsInputSchema,
    handler: (params) =>
      restPost('/api/youpd/rest/youtube/snapshots/capture', params),
    fallback: 'v0.12 REST wrapper: capture video/channel metric snapshots.',
  });
  registerSimpleTool(server, {
    name: 'queryHotVideos',
    title: 'Query persisted hot videos through v0.12 REST',
    inputSchema: QueryHotVideosInputSchema,
    handler: (params) => restPost('/api/youpd/rest/query/hot-videos', params),
    fallback: 'v0.12 REST wrapper: query persisted hot videos.',
    readOnly: true,
    idempotent: true,
  });
  registerSimpleTool(server, {
    name: 'summarizeKeywordMarket',
    title: 'Summarize keyword market through v0.12 REST',
    inputSchema: KeywordSummaryInputSchema,
    handler: (params) =>
      restPost('/api/youpd/rest/query/keyword-summary', params),
    fallback: 'v0.12 REST wrapper: summarize persisted keyword search results.',
    readOnly: true,
    idempotent: true,
  });
  registerSimpleTool(server, {
    name: 'summarizeChannel',
    title: 'Summarize channel through v0.12 REST',
    inputSchema: ChannelSummaryInputSchema,
    handler: (params) =>
      restPost('/api/youpd/rest/query/channel-summary', params),
    fallback: 'v0.12 REST wrapper: summarize persisted channel metrics.',
    readOnly: true,
    idempotent: true,
  });
  registerSimpleTool(server, {
    name: 'queryVideoMetricSnapshots',
    title: 'Query video metric snapshots through v0.12 REST',
    inputSchema: VideoSnapshotsQueryInputSchema,
    handler: (params) =>
      restPost('/api/youpd/rest/query/video-snapshots', params),
    fallback: 'v0.12 REST wrapper: query persisted video metric snapshots.',
    readOnly: true,
    idempotent: true,
  });
  registerSimpleTool(server, {
    name: 'queryChannelMetricSnapshots',
    title: 'Query channel metric snapshots through v0.12 REST',
    inputSchema: ChannelSnapshotsQueryInputSchema,
    handler: (params) =>
      restPost('/api/youpd/rest/query/channel-snapshots', params),
    fallback: 'v0.12 REST wrapper: query persisted channel metric snapshots.',
    readOnly: true,
    idempotent: true,
  });
}

// Lightweight registration helper for tools that match the shared
// "Zod input → async handler → json/error content" shape so each new tool
// doesn't need a bespoke wrapper.
function registerSimpleTool<TIn extends z.ZodObject<z.ZodRawShape>>(
  server: McpServer,
  spec: {
    name: string;
    title: string;
    inputSchema: TIn;
    handler: (params: z.infer<TIn>) => Promise<unknown>;
    fallback: string;
    readOnly?: boolean;
    idempotent?: boolean;
  },
): void {
  server.registerTool(
    spec.name,
    {
      title: spec.title,
      description: shortDescription(spec.name, spec.fallback),
      inputSchema: spec.inputSchema.shape,
      annotations: {
        readOnlyHint: spec.readOnly ?? false,
        destructiveHint: false,
        idempotentHint: spec.idempotent ?? false,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        return jsonContent(await spec.handler(params as z.infer<TIn>));
      } catch (err) {
        return errorContent(err);
      }
    },
  );
}

function jsonContent(output: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(output) }],
    structuredContent: output as Record<string, unknown>,
  };
}

function errorContent(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const code = errorCodeFor(err);
  const payload = { error: { code, message } };
  return {
    isError: true as const,
    content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
    structuredContent: payload,
  };
}

function errorCodeFor(err: unknown): string {
  if (err instanceof Error) {
    return err.name;
  }
  return 'unknown';
}
