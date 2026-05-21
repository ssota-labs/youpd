import { expect, test } from '@playwright/test';

const WEB_PORT = Number(process.env.WEB_PORT ?? 3000);

test('apps/web root page responds', async ({ request }) => {
  const response = await request.get(`http://127.0.0.1:${WEB_PORT}/`);
  expect(response.status(), await response.text()).toBe(200);
});
