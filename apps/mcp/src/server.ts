import 'server-only';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Register all MCP tools on a server instance. Called once per request by
// mcp-handler — the second-arg `extra` parameter carries `authInfo` from
// withMcpAuth, including the authenticated userId in `authInfo.extra.userId`.
export function registerTools(server: McpServer): void {
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
