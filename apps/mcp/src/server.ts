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
  ThumbnailAddLayerInputSchema,
  ThumbnailApplyTemplateInputSchema,
  ThumbnailCreateInputSchema,
  ThumbnailDeleteLayerInputSchema,
  ThumbnailExportPngInputSchema,
  ThumbnailGetEmbedUrlInputSchema,
  ThumbnailListInputSchema,
  ThumbnailReorderLayersInputSchema,
  ThumbnailSetLayerInputSchema,
  ThumbnailSuggestTitlesInputSchema,
  thumbnailAddLayer,
  thumbnailApplyTemplate,
  thumbnailCreate,
  thumbnailDeleteLayer,
  thumbnailExportPng,
  thumbnailGetEmbedUrl,
  thumbnailList,
  thumbnailReorderLayers,
  thumbnailSetLayer,
  thumbnailSuggestTitlesFromComments,
} from '@youpd/api/mcp/tools';
import {
  getBundleManifest,
  getLatestVersion,
  getLatestVersionSchema,
} from '@youpd/api/mcp/version';
import {
  QuotaExceededAtBudgetError,
} from '@youpd/api/mcp/quota';
import {
  GetSkillGroupInputSchema,
  TOOL_DOCS_BY_NAME,
  buildSkillGroupResponse,
  buildSkillGroupRoutingDescription,
} from '@youpd/api/mcp/progressive';
import { QuotaExceededError, YouTubeApiError } from '@youpd/youtube';

function shortDescription(name: string, fallback: string): string {
  const doc = TOOL_DOCS_BY_NAME.get(name);
  return doc ? doc.short_description : fallback;
}

// Register all MCP tools on a server instance. Called once per request by
// mcp-handler — the second-arg `extra` parameter carries `authInfo` from
// withMcpAuth, including the authenticated userId in `authInfo.extra.userId`.
export function registerTools(server: McpServer): void {
  registerPing(server);
  registerGetSkillGroup(server);
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
  registerThumbnailTools(server);
}

function registerThumbnailTools(server: McpServer): void {
  registerSimpleTool(server, {
    name: 'thumbnail_create',
    title: 'Create a thumbnail design (template or document)',
    inputSchema: ThumbnailCreateInputSchema,
    handler: thumbnailCreate,
    fallback: 'Create thumbnail row. 0 quota.',
  });
  registerSimpleTool(server, {
    name: 'thumbnail_list',
    title: 'List thumbnails for a Notion candidate',
    inputSchema: ThumbnailListInputSchema,
    handler: thumbnailList,
    fallback: 'List thumbnails by candidate. 0 quota.',
    readOnly: true,
    idempotent: true,
  });
  registerSimpleTool(server, {
    name: 'thumbnail_set_layer',
    title: 'Patch a single layer on a thumbnail',
    inputSchema: ThumbnailSetLayerInputSchema,
    handler: thumbnailSetLayer,
    fallback: 'Patch one layer with optimistic version lock. 0 quota.',
  });
  registerSimpleTool(server, {
    name: 'thumbnail_add_layer',
    title: 'Append a layer to a thumbnail',
    inputSchema: ThumbnailAddLayerInputSchema,
    handler: thumbnailAddLayer,
    fallback: 'Append a layer to a thumbnail. 0 quota.',
  });
  registerSimpleTool(server, {
    name: 'thumbnail_apply_template',
    title: 'Create a thumbnail from a template + fillers',
    inputSchema: ThumbnailApplyTemplateInputSchema,
    handler: thumbnailApplyTemplate,
    fallback: 'Apply a template with fillers. 0 quota.',
  });
  registerSimpleTool(server, {
    name: 'thumbnail_suggest_titles_from_comments',
    title: 'Suggest thumbnail copy from comment texts',
    inputSchema: ThumbnailSuggestTitlesInputSchema,
    handler: thumbnailSuggestTitlesFromComments,
    fallback: 'Suggest thumbnail copy from comments. 0 quota.',
    readOnly: true,
    idempotent: true,
  });
  registerSimpleTool(server, {
    name: 'thumbnail_export_png',
    title: 'Render and upload a thumbnail PNG',
    inputSchema: ThumbnailExportPngInputSchema,
    handler: thumbnailExportPng,
    fallback: 'Render PNG via satori + upload to Supabase Storage. 0 quota.',
  });
  registerSimpleTool(server, {
    name: 'thumbnail_get_embed_url',
    title: 'Get the iframe embed URL for a thumbnail',
    inputSchema: ThumbnailGetEmbedUrlInputSchema,
    handler: thumbnailGetEmbedUrl,
    fallback: 'Build designer iframe URL. 0 quota.',
    readOnly: true,
    idempotent: true,
  });
  registerSimpleTool(server, {
    name: 'thumbnail_reorder_layers',
    title: 'Reorder z-order of layers on a thumbnail',
    inputSchema: ThumbnailReorderLayersInputSchema,
    handler: thumbnailReorderLayers,
    fallback: 'Reorder thumbnail layers. 0 quota.',
  });
  registerSimpleTool(server, {
    name: 'thumbnail_delete_layer',
    title: 'Delete a single layer from a thumbnail',
    inputSchema: ThumbnailDeleteLayerInputSchema,
    handler: thumbnailDeleteLayer,
    fallback: 'Delete a thumbnail layer. 0 quota.',
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

function registerGetSkillGroup(server: McpServer): void {
  server.registerTool(
    'get_skill_group',
    {
      title: 'Get YouPD skill group docs',
      description: buildSkillGroupRoutingDescription(),
      inputSchema: GetSkillGroupInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      try {
        return jsonContent(buildSkillGroupResponse(params.code));
      } catch (err) {
        return errorContent(err);
      }
    },
  );
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

function registerNotionCreateKeyCandidate(server: McpServer): void {
  server.registerTool(
    'notion_create_key_candidate',
    {
      title: 'Build Notion properties payload for a Key Content Candidate',
      description: shortDescription(
        'notion_create_key_candidate',
        'Notion key_content_candidates pages.create properties payload. 0 quota.',
      ),
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
      description: shortDescription(
        'notion_create_pull_candidate',
        'Notion pull_content_candidates pages.create properties payload. 0 quota.',
      ),
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

function registerVersionTools(server: McpServer): void {
  const EmptySchema = z.object({}).strict();
  const VersionSchemaInput = z
    .object({ db_name: z.string().min(1).optional() })
    .strict();

  server.registerTool(
    'get_latest_version',
    {
      title: 'Get latest YouPD bundle version',
      description: shortDescription(
        'get_latest_version',
        'Returns the bundle + schema version string.',
      ),
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
      description: shortDescription(
        'get_latest_version_schema',
        '11개 Notion DB 스키마(or 단일 db_name) 반환. 0 quota.',
      ),
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
      description: shortDescription(
        'get_bundle_manifest',
        'Bundle version + template + healthcheck + changelog. Core entry point.',
      ),
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
  if (err instanceof Error) {
    // Map domain errors to stable wire codes per spec §4-2/§4-3.
    switch (err.name) {
      case 'InvalidLayerPatchError':
        return 'INVALID_LAYER_PATCH';
      case 'ThumbnailVersionConflictError':
        return 'VERSION_CONFLICT';
      case 'ThumbnailNotFoundError':
        return 'THUMBNAIL_NOT_FOUND';
      case 'TemplateNotFoundError':
        return 'TEMPLATE_NOT_FOUND';
      case 'LayerNotFoundError':
        return 'LAYER_NOT_FOUND';
      default:
        return err.name;
    }
  }
  return 'unknown';
}
