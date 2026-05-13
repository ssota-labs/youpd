import { expect, test } from '@playwright/test';

const ADMIN_PORT = Number(process.env.ADMIN_PORT ?? 3001);

test('apps/admin /api/health reads from local Supabase', async ({ request }) => {
  const response = await request.get(`http://127.0.0.1:${ADMIN_PORT}/api/health`);
  expect(response.status(), await response.text()).toBe(200);
  const body = await response.json();
  expect(body).toEqual({ status: 'ok', key: 'liveness', value: 'ok' });
});
