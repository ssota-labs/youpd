import 'server-only';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ComputeMetricsInputSchema,
  FetchHotChartInputSchema,
  FetchTrendingByKeywordInputSchema,
  GetChannelAllVideosInputSchema,
  GetChannelOverviewInputSchema,
  GetVideoCommentsInputSchema,
  GetVideoDetailInputSchema,
  SearchKeywordInputSchema,
  SearchSessionsSummaryInputSchema,
  SnapshotNowInputSchema,
  computeMetrics,
  fetchHotChart,
  fetchTrendingByKeyword,
  getChannelAllVideos,
  getChannelOverview,
  getVideoComments,
  getVideoDetail,
  searchKeyword,
  searchSessionsSummary,
  snapshotNow,
} from '@youpd/api/mcp/tools';
import { QuotaExceededAtBudgetError } from '@youpd/api/mcp/quota';
import { QuotaExceededError, YouTubeApiError } from '@youpd/youtube';

/** Short MCP tool descriptions (no progressive routing layer). */
const TOOL_SHORT_DESCRIPTIONS: Record<string, string> = {
  search_keyword:
    'YouTube search.list → videos.list → channels.list. ~102 quota.',
  get_video_detail:
    'videos.list + channels.list + top 50 comments. ~3 quota.',
  get_channel_overview:
    'channels.list + uploads playlist + videos.list, sorted by view count. ~3 quota.',
  get_channel_all_videos:
    'Paginated uploads + videos.list batches. Budget = 1 + 2 × ceil(max/50) quota.',
  get_video_comments:
    'commentThreads.list ordered by likeCount → top_n. 1 quota.',
  fetch_hot_chart:
    'videos.list?chart=mostPopular for region/category. 1 quota.',
  fetch_trending_by_keyword:
    'search.list(publishedAfter=now-Nh) + videos/channels enrich. ~102 quota.',
  snapshot_now:
    'videos.list batched 50/call → snapshot row per video. ~ceil(N/50) quota.',
  compute_metrics:
    '기여도/성과도/노출확률 순수 함수 계산. 0 quota.',
  search_sessions_summary:
    'MCP search_sessions 감사 로그 집계 (server-wide). 0 quota.',
};

function shortDescription(name: string, fallback: string): string {
  return TOOL_SHORT_DESCRIPTIONS[name] ?? fallback;
}

// Register all MCP tools on a server instance. Called once per request by
// mcp-handler — the second-arg `extra` parameter carries `authInfo` from
// withMcpAuth, including the authenticated userId in `authInfo.extra.userId`.
export function registerTools(server: McpServer): void {
  registerSearchKeyword(server);
  registerGetVideoDetail(server);
  registerGetChannelOverview(server);
  registerGetChannelAllVideos(server);
  registerGetVideoComments(server);
  registerFetchHotChart(server);
  registerFetchTrendingByKeyword(server);
  registerSnapshotNow(server);
  registerComputeMetrics(server);
  registerSearchSessionsSummary(server);
}

function registerSearchKeyword(server: McpServer): void {
  server.registerTool(
    'search_keyword',
    {
      title: 'Search YouTube by keyword',
      description: shortDescription(
        'search_keyword',
        'YouTube search.list → videos.list → channels.list. ~102 quota.',
      ),
      inputSchema: SearchKeywordInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const out = await searchKeyword(params);
        return jsonContent(out);
      } catch (err) {
        return errorContent(err);
      }
    },
  );
}

function registerGetVideoDetail(server: McpServer): void {
  server.registerTool(
    'get_video_detail',
    {
      title: 'Get full detail for a single YouTube video',
      description: shortDescription(
        'get_video_detail',
        'videos.list + channels.list + top 50 comments. ~3 quota.',
      ),
      inputSchema: GetVideoDetailInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const out = await getVideoDetail(params);
        return jsonContent(out);
      } catch (err) {
        return errorContent(err);
      }
    },
  );
}

function registerGetChannelOverview(server: McpServer): void {
  server.registerTool(
    'get_channel_overview',
    {
      title: 'Get channel overview with top-N popular videos',
      description: shortDescription(
        'get_channel_overview',
        'channels.list + uploads playlist + videos.list, sorted by view count. ~3 quota.',
      ),
      inputSchema: GetChannelOverviewInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        return jsonContent(await getChannelOverview(params));
      } catch (err) {
        return errorContent(err);
      }
    },
  );
}

function registerGetChannelAllVideos(server: McpServer): void {
  server.registerTool(
    'get_channel_all_videos',
    {
      title: 'Bulk-fetch every video in a channel (paginated)',
      description: shortDescription(
        'get_channel_all_videos',
        'Paginated uploads + videos.list batches. Budget = 1 + 2 × ceil(max/50) quota.',
      ),
      inputSchema: GetChannelAllVideosInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        return jsonContent(await getChannelAllVideos(params));
      } catch (err) {
        return errorContent(err);
      }
    },
  );
}

function registerGetVideoComments(server: McpServer): void {
  server.registerTool(
    'get_video_comments',
    {
      title: 'Get TOP N liked comments for a video',
      description: shortDescription(
        'get_video_comments',
        'commentThreads.list ordered by likeCount → top_n. 1 quota.',
      ),
      inputSchema: GetVideoCommentsInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        return jsonContent(await getVideoComments(params));
      } catch (err) {
        return errorContent(err);
      }
    },
  );
}

function registerFetchHotChart(server: McpServer): void {
  server.registerTool(
    'fetch_hot_chart',
    {
      title: 'YouTube most-popular chart for a region/category',
      description: shortDescription(
        'fetch_hot_chart',
        'videos.list?chart=mostPopular for region/category. 1 quota.',
      ),
      inputSchema: FetchHotChartInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        return jsonContent(await fetchHotChart(params));
      } catch (err) {
        return errorContent(err);
      }
    },
  );
}

function registerFetchTrendingByKeyword(server: McpServer): void {
  server.registerTool(
    'fetch_trending_by_keyword',
    {
      title: 'Surface fast-rising videos in the last N hours for a keyword',
      description: shortDescription(
        'fetch_trending_by_keyword',
        'search.list(publishedAfter=now-Nh) + videos/channels enrich. ~102 quota.',
      ),
      inputSchema: FetchTrendingByKeywordInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        return jsonContent(await fetchTrendingByKeyword(params));
      } catch (err) {
        return errorContent(err);
      }
    },
  );
}

function registerSnapshotNow(server: McpServer): void {
  server.registerTool(
    'snapshot_now',
    {
      title: 'Capture today\'s views/likes/comments for tracked videos',
      description: shortDescription(
        'snapshot_now',
        'videos.list batched 50/call → snapshot row per video. ~ceil(N/50) quota.',
      ),
      inputSchema: SnapshotNowInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        return jsonContent(await snapshotNow(params));
      } catch (err) {
        return errorContent(err);
      }
    },
  );
}

function registerComputeMetrics(server: McpServer): void {
  server.registerTool(
    'compute_metrics',
    {
      title: 'Compute 기여도 / 성과도 / 노출확률 from snapshot history',
      description: shortDescription(
        'compute_metrics',
        '기여도/성과도/노출확률 순수 함수 계산. 0 quota.',
      ),
      inputSchema: ComputeMetricsInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        return jsonContent(await computeMetrics(params));
      } catch (err) {
        return errorContent(err);
      }
    },
  );
}

function registerSearchSessionsSummary(server: McpServer): void {
  server.registerTool(
    'search_sessions_summary',
    {
      title: 'Aggregate MCP search_sessions for an operator dashboard',
      description: shortDescription(
        'search_sessions_summary',
        'MCP search_sessions 감사 로그 집계 (server-wide). 0 quota.',
      ),
      inputSchema: SearchSessionsSummaryInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        return jsonContent(await searchSessionsSummary(params));
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
  if (err instanceof QuotaExceededAtBudgetError) return 'budget_exceeded';
  if (err instanceof QuotaExceededError) return 'youtube_quota_exceeded';
  if (err instanceof YouTubeApiError) return `youtube_${err.reason}`;
  if (err instanceof Error) {
    return err.name;
  }
  return 'unknown';
}
