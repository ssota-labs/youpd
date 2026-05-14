import 'server-only';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ComputeMetricsInputSchema,
  FetchHotChartInputSchema,
  FetchTrendingByKeywordInputSchema,
  GetChannelAllVideosInputSchema,
  GetChannelOverviewInputSchema,
  GetVideoCommentsInputSchema,
  GetVideoDetailInputSchema,
  NotionCreateKeyCandidateInputSchema,
  NotionCreatePullCandidateInputSchema,
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
  notionCreateKeyCandidate,
  notionCreatePullCandidate,
  searchKeyword,
  searchSessionsSummary,
  snapshotNow,
} from '@youpd/api/mcp/tools';
import {
  getBundleManifest,
  getLatestVersion,
  getLatestVersionSchema,
} from '@youpd/api/mcp/version';
import {
  QuotaExceededAtBudgetError,
} from '@youpd/api/mcp/quota';
import { QuotaExceededError, YouTubeApiError } from '@youpd/youtube';

// Register all MCP tools on a server instance. Called once per request by
// mcp-handler — the second-arg `extra` parameter carries `authInfo` from
// withMcpAuth, including the authenticated userId in `authInfo.extra.userId`.
export function registerTools(server: McpServer): void {
  registerPing(server);
  registerSearchKeyword(server);
  registerGetVideoDetail(server);
  registerGetChannelOverview(server);
  registerGetChannelAllVideos(server);
  registerGetVideoComments(server);
  registerFetchHotChart(server);
  registerFetchTrendingByKeyword(server);
  registerSnapshotNow(server);
  registerComputeMetrics(server);
  registerNotionCreateKeyCandidate(server);
  registerNotionCreatePullCandidate(server);
  registerSearchSessionsSummary(server);
  registerVersionTools(server);
}

function registerPing(server: McpServer): void {
  const PingInputSchema = z.object({ message: z.string().optional() }).strict();

  server.registerTool(
    'ping',
    {
      title: 'Ping',
      description: 'Health check that echoes an optional message and returns a timestamp.',
      inputSchema: PingInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params, extra) => {
      const authExtra = extra?.authInfo?.extra as
        | { userId?: string }
        | undefined;
      const output = {
        status: 'ok' as const,
        timestamp: new Date().toISOString(),
        echo: params.message ?? null,
        userId: authExtra?.userId ?? null,
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      };
    },
  );
}

function registerSearchKeyword(server: McpServer): void {
  server.registerTool(
    'search_keyword',
    {
      title: 'Search YouTube by keyword',
      description:
        'YouTube search.list → videos.list → channels.list. Returns normalised video and channel summaries. ~102 quota units.',
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
      description:
        'videos.list + channels.list + commentThreads.list (TOP 50 by likeCount). ~3 quota units.',
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
      description:
        'channels.list + playlistItems.list (uploads, 50 most recent) + videos.list, sorted by view count locally. ~3 quota units.',
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
      description:
        'channels.list + playlistItems pagination over uploads + videos.list batches. Budget = 1 + 2 × ceil(max_videos/50) units. For deep competitor analysis.',
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
      description:
        'commentThreads.list(order=relevance, maxResults=100) → sort by likeCount desc → top_n. 1 unit. Returns comments_disabled=true when YouTube refuses the call.',
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
      description:
        'videos.list?chart=mostPopular for the given region (KR by default) + optional videoCategoryId. 1 unit.',
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
      description:
        'search.list(publishedAfter=now-Nh, order=viewCount) → videos.list + channels.list enrichment. Default 24h window, ~102 quota units.',
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
      description:
        'videos.list batched 50 IDs/call → one snapshot row per video. ~ceil(N/50) quota units. Agent upserts each row into the Video Snapshots DB (snapshot_date is PT-calendar to match the YouTube quota window).',
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
      description:
        'Pure function — 0 YouTube units. Mirrors the Videos DB formulas: contribution = views / channel_avg_views, performance = views / channel_subs, exposure_probability = (7d delta/7) / (30d delta/30).',
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

function registerNotionCreateKeyCandidate(server: McpServer): void {
  server.registerTool(
    'notion_create_key_candidate',
    {
      title: 'Build Notion properties payload for a Key Content Candidate',
      description:
        'Returns { properties, icon, database_ref="key_content_candidates" } shaped for Notion pages.create. The agent supplies parent.database_id from Agent Meta. 0 YouTube units.',
      inputSchema: NotionCreateKeyCandidateInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        return jsonContent(await notionCreateKeyCandidate(params));
      } catch (err) {
        return errorContent(err);
      }
    },
  );
}

function registerNotionCreatePullCandidate(server: McpServer): void {
  server.registerTool(
    'notion_create_pull_candidate',
    {
      title: 'Build Notion properties payload for a Pull Content Candidate',
      description:
        'Returns { properties, icon, database_ref="pull_content_candidates" } shaped for Notion pages.create. The agent supplies parent.database_id from Agent Meta. 0 YouTube units.',
      inputSchema: NotionCreatePullCandidateInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        return jsonContent(await notionCreatePullCandidate(params));
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
      description:
        'Server-wide aggregation over the MCP server\'s search_sessions audit log. PT-bucketed day window. 0 YouTube units. group_by: operation | status | day | operation+status.',
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

function registerVersionTools(server: McpServer): void {
  const EmptySchema = z.object({}).strict();
  const VersionSchemaInput = z
    .object({ db_name: z.string().min(1).optional() })
    .strict();

  server.registerTool(
    'get_latest_version',
    {
      title: 'Get latest YouPD bundle version',
      description: 'Returns the bundle + schema version string the MCP server publishes.',
      inputSchema: EmptySchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => jsonContent(getLatestVersion()),
  );

  server.registerTool(
    'get_latest_version_schema',
    {
      title: 'Get Notion DB schema for the latest version',
      description:
        'Returns Notion createDatabase-shaped schema for all 11 YouPD DBs (Keywords, Channels, Videos, Snapshots, Comments, Candidates, Sessions, Hot, Agent Meta) or a specific one when db_name is provided.',
      inputSchema: VersionSchemaInput.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        const out = getLatestVersionSchema(params.db_name);
        return jsonContent(out);
      } catch (err) {
        return errorContent(err);
      }
    },
  );

  server.registerTool(
    'get_bundle_manifest',
    {
      title: 'Get YouPD bundle manifest',
      description:
        'Bundle version + template page URL + healthcheck URL + changelog. Entry point for the agent first dialog.',
      inputSchema: EmptySchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => jsonContent(getBundleManifest()),
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
  if (err instanceof Error) return err.name;
  return 'unknown';
}
