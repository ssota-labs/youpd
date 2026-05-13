import 'server-only';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  GetVideoDetailInputSchema,
  SearchKeywordInputSchema,
  getVideoDetail,
  searchKeyword,
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
