import 'server-only';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { QuotaExceededAtBudgetError } from '@youpd/api/mcp/quota';
import {
  AnalyzeChannelInputSchema,
  AnalyzeVideoInputSchema,
  GetTrendingVideosInputSchema,
  SearchKeywordWorkflowInputSchema,
  getStoredTrendingVideos,
} from '@youpd/api/youtube';
import { YouTubeApiError } from '@youpd/youtube';
import { enqueueYoupdJob, getYoupdJobStatus, JobNotFoundError } from './workflows/jobs';
import { GetJobStatusInputSchema } from './workflows/schemas';

/** Agent-facing MCP workflow tool descriptions. */
const TOOL_DESCRIPTIONS: Record<string, string> = {
  youpd_analyze_video:
    'Use when you need a full analysis report for one known YouTube videoId. Inputs: videoId, optional includeComments and commentsTopN. Side effects: enqueues a durable analysis job that stores video/channel data, comments, and an initial metric snapshot internally. Returns job_id, status, and workflow immediately; poll youpd_get_job_status for the scored video detail, channel summary, comments, and snapshot status.',
  youpd_analyze_channel:
    'Use when you need a channel-level performance report for one known channelId. Inputs: channelId, optional maxVideos, topPerformingLimit, includeComments. Side effects: enqueues a durable analysis job that collects/stores channel metadata, channel videos, snapshots, and optional comment analysis for top performers. Returns job_id, status, and workflow immediately; poll youpd_get_job_status for the channel summary, scored catalog, and top performing videos.',
  youpd_search_keyword:
    'Use when a user asks to research a keyword market and wants analyzed video candidates. Inputs: keyword, regionCode, limit, order. Side effects: enqueues a durable search job that searches YouTube, stores results, and runs video analysis for each candidate internally. Returns job_id, status, and workflow immediately; poll youpd_get_job_status for analyzed keyword results and channel summaries.',
  youpd_get_trending_videos:
    'Use when you need stored hot/trending videos with filters and pagination. Inputs: date (required YYYY-MM-DD), optional dateEnd, regionCode (default KR), categoryId, q, page (default 1), limit (default 10), sort, order, isShort (default false = exclude shorts; null = all), minPerformanceGrade/minContributionGrade (default Good; null disables), scoreLogic (default or), minSubscribers, maxSubscribers, minViews, maxViews. Side effects: read-only and idempotent; does not call YouTube directly. Returns paginated scored videos with total/hasMore, or a missing-data warning when no rows match.',
  youpd_get_job_status:
    'Use to poll an async YouTube analysis job started by youpd_analyze_video, youpd_analyze_channel, or youpd_search_keyword. Inputs: job_id from the enqueue response. Side effects: read-only status lookup against the durable workflow runtime. Returns current status and includes result data when completed or error details when failed.',
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
    handler: (params) => enqueueYoupdJob('analyze-video', params),
    readOnly: false,
  });
  registerWorkflowTool(server, {
    name: 'youpd_analyze_channel',
    title: 'Analyze one YouTube channel',
    inputSchema: AnalyzeChannelInputSchema,
    handler: (params) => enqueueYoupdJob('analyze-channel', params),
    readOnly: false,
  });
  registerWorkflowTool(server, {
    name: 'youpd_search_keyword',
    title: 'Search and analyze a YouTube keyword market',
    inputSchema: SearchKeywordWorkflowInputSchema,
    handler: (params) => enqueueYoupdJob('search-keyword', params),
    readOnly: false,
  });
  registerWorkflowTool(server, {
    name: 'youpd_get_trending_videos',
    title: 'Get stored trending YouTube videos',
    inputSchema: GetTrendingVideosInputSchema,
    handler: (params) => getStoredTrendingVideos(params),
    readOnly: true,
    idempotent: true,
  });
  registerWorkflowTool(server, {
    name: 'youpd_get_job_status',
    title: 'Get async YouTube workflow job status',
    inputSchema: GetJobStatusInputSchema,
    handler: (params) => getYoupdJobStatus(params.job_id),
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
  if (err instanceof z.ZodError) {
    return 'ZodError';
  }
  if (err instanceof JobNotFoundError) {
    return 'JobNotFoundError';
  }
  if (err instanceof QuotaExceededAtBudgetError) {
    return 'QuotaExceededAtBudgetError';
  }
  if (err instanceof YouTubeApiError) {
    return 'YouTubeApiError';
  }
  if (err instanceof Error) {
    return err.name;
  }
  return 'unknown';
}
