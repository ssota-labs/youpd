import http from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from './server';

const PORT = Number(process.env.MCP_PORT ?? process.env.PORT ?? 3002);
const HOST = '127.0.0.1';

const httpServer = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? HOST}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (url.pathname === '/mcp') {
      const server = createMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      await server.connect(transport);
      await transport.handleRequest(req, res);
      return;
    }

    res.statusCode = 404;
    res.end('not found');
  } catch (err) {
    console.error('[mcp] request error', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('internal error');
    }
  }
});

httpServer.listen(PORT, HOST, () => {
  console.log(`[mcp] listening on http://${HOST}:${PORT} (health=/health, mcp=/mcp)`);
});
