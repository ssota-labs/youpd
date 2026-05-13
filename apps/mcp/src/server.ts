import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: '@youpd/mcp',
    version: '0.0.0',
  });

  const PingInputSchema = z
    .object({ message: z.string().optional() })
    .strict();

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
    async (params) => {
      const output = {
        status: 'ok' as const,
        timestamp: new Date().toISOString(),
        echo: params.message ?? null,
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        structuredContent: output,
      };
    },
  );

  return server;
}
