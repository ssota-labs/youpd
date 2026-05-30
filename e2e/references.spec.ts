import { expect, test } from '@playwright/test';

const WEB_PORT = Number(process.env.WEB_PORT ?? 3000);
const BASE_URL = `http://127.0.0.1:${WEB_PORT}`;

test.describe('reference evidence pool', () => {
  test('sidebar opens references page', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`);
    await page.getByRole('link', { name: 'References' }).click();
    await expect(page).toHaveURL(/\/references$/);
    await expect(
      page.getByRole('heading', { level: 1, name: '레퍼런스' }),
    ).toBeVisible();

    await page.screenshot({
      path: 'test-results/references-list-empty.png',
      fullPage: true,
    });
  });

  test('creates group with stage folders and lists folders', async ({ page }) => {
    const title = `E2E 레퍼런스 ${Date.now()}`;

    await page.goto(`${BASE_URL}/references`);
    await page.getByLabel('제목').fill(title);
    await page.getByLabel('타깃').fill('1인 크리에이터');
    await page.getByLabel('시드 테마').fill('엑셀 자동화');
    await page.getByLabel('기획 의도').fill('S4 VERF E2E group create');
    await page.getByRole('button', { name: '그룹 만들기' }).click();

    const groupLink = page.getByRole('link', { name: title });
    await expect(groupLink).toBeVisible({ timeout: 15_000 });
    await expect(groupLink.getByText('폴더 7', { exact: true })).toBeVisible();

    await page.getByRole('link', { name: title }).click();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.getByText('문제 인식')).toBeVisible();
    await expect(page.getByText('현상 인지')).toBeVisible();

    await page.screenshot({
      path: 'test-results/references-group-folders.png',
      fullPage: true,
    });
  });

  test('reference-groups API lists created groups', async ({ request }) => {
    const title = `API 레퍼런스 ${Date.now()}`;
    const createRes = await request.post(`${BASE_URL}/api/reference-groups`, {
      data: {
        title,
        audience: '테스트 타깃',
        seedTheme: '테스트 테마',
        intentSummary: 'S4 VERF API coverage',
        seedStageFolders: true,
      },
    });
    expect(createRes.status(), await createRes.text()).toBe(201);
    const created = (await createRes.json()) as { id: string; folders: unknown[] };
    expect(created.folders.length).toBe(7);

    const listRes = await request.get(`${BASE_URL}/api/reference-groups`);
    expect(listRes.ok()).toBeTruthy();
    const listed = (await listRes.json()) as {
      groups: Array<{ id: string; title: string }>;
    };
    expect(listed.groups.some((g) => g.id === created.id)).toBe(true);
    expect(listed.groups.some((g) => g.title === title)).toBe(true);
  });
});
