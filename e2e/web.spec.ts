import { expect, test } from '@playwright/test';

const WEB_PORT = Number(process.env.WEB_PORT ?? 3000);

test('apps/web /api/health reads from local Supabase', async ({ request }) => {
  const response = await request.get(`http://127.0.0.1:${WEB_PORT}/api/health`);
  expect(response.status(), await response.text()).toBe(200);
  const body = await response.json();
  expect(body).toEqual({ status: 'ok', key: 'liveness', value: 'ok' });
});
