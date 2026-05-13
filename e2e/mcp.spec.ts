import { expect, test } from '@playwright/test';

const MCP_PORT = Number(process.env.MCP_PORT ?? 3002);

test('apps/mcp /health responds with ok', async ({ request }) => {
  const response = await request.get(`http://127.0.0.1:${MCP_PORT}/health`);
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toEqual({ status: 'ok' });
});
