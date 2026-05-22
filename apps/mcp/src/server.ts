import 'server-only';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  AnalyzeChannelInputSchema,
  AnalyzeVideoInputSchema,
  GetTrendingVideosInputSchema,
  SearchKeywordWorkflowInputSchema,
} from '@youpd/api/youtube';
import { restPost } from './youpd-rest';

/** Agent-facing MCP workflow tool descriptions. */
const TOOL_DESCRIPTIONS: Record<string, string> = {
  youpd_analyze_video:
    'Use when you need a full analysis report for one known YouTube videoId. Inputs: videoId, optional includeComments and commentsTopN. Side effects: the system ensures video/channel data, comments, and an initial metric snapshot are stored internally; the caller does not choose persist or fetch mode. Returns scored video detail, channel summary, comments, and snapshot status.',
  youpd_analyze_channel:
    'Use when you need a channel-level performance report for one known channelId. Inputs: channelId, optional maxVideos, topPerformingLimit, includeComments. Side effects: the system collects/stores channel metadata, channel videos, snapshots, and optional comment analysis for top performers. Returns channel summary, scored catalog, and top performing videos.',
  youpd_search_keyword:
    'Use when a user asks to research a keyword market and wants analyzed video candidates. Inputs: keyword, regionCode, limit, order. Side effects: the system searches YouTube, stores results, and runs video analysis for each candidate internally. Returns analyzed keyword results and channel summaries.',
  youpd_get_trending_videos:
    'Use when you need stored trending videos for a specific date and region. Inputs: date, regionCode, optional categoryId, limit. Side effects: read-only and idempotent; does not call YouTube directly. Returns persisted trending rows or a clear missing-data warning if the daily scheduler has not populated the date yet.',
};

function workflowDescription(name: string): string {
  const description = TOOL_DESCRIPTIONS[name];
  if (!description) {
    throw new Error(`Missing MCP description for ${name}`);
  }
  return description;
}

export function registerTools(server: McpServer): void {
  registerWorkflowTool(server, {
    name: 'youpd_analyze_video',
    title: 'Analyze one YouTube video',
    inputSchema: AnalyzeVideoInputSchema,
    handler: (params) =>
      restPost('/api/youpd/rest/workflows/analyze-video', params),
    readOnly: false,
  });
  registerWorkflowTool(server, {
    name: 'youpd_analyze_channel',
    title: 'Analyze one YouTube channel',
    inputSchema: AnalyzeChannelInputSchema,
    handler: (params) =>
      restPost('/api/youpd/rest/workflows/analyze-channel', params),
    readOnly: false,
  });
  registerWorkflowTool(server, {
    name: 'youpd_search_keyword',
    title: 'Search and analyze a YouTube keyword market',
    inputSchema: SearchKeywordWorkflowInputSchema,
    handler: (params) =>
      restPost('/api/youpd/rest/workflows/search-keyword', params),
    readOnly: false,
  });
  registerWorkflowTool(server, {
    name: 'youpd_get_trending_videos',
    title: 'Get stored trending YouTube videos',
    inputSchema: GetTrendingVideosInputSchema,
    handler: (params) =>
      restPost('/api/youpd/rest/workflows/get-trending-videos', params),
    readOnly: true,
    idempotent: true,
  });
}

function registerWorkflowTool<TIn extends z.ZodObject<z.ZodRawShape>>(
  server: McpServer,
  spec: {
    name: string;
    title: string;
    inputSchema: TIn;
    handler: (params: z.infer<TIn>) => Promise<unknown>;
    readOnly?: boolean;
    idempotent?: boolean;
  },
): void {
  server.registerTool(
    spec.name,
    {
      title: spec.title,
      description: workflowDescription(spec.name),
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
