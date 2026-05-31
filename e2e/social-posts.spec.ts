import { expect, test } from '@playwright/test';

const WEB_PORT = Number(process.env.WEB_PORT ?? 3000);
const BASE_URL = `http://127.0.0.1:${WEB_PORT}`;

const FIXTURE_THREADS_URL =
  'https://www.threads.net/@youpd_fixture/post/C0FIXTURE001';

test.describe('social posts as reference evidence (S9)', () => {
  test('sidebar opens social hub with not-configured providers', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`);
    await page.getByRole('link', { name: 'Social' }).click();
    await expect(page).toHaveURL(/\/social$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Social' })).toBeVisible();
    await expect(page.getByText('연동 상태')).toBeVisible();
    await expect(page.getByText('미구성').first()).toBeVisible();
    await expect(
      page.getByText('URL을 직접 붙여넣을 수 있습니다.').first(),
    ).toBeVisible();

    await page.screenshot({
      path: 'test-results/social-hub-sources.png',
      fullPage: true,
    });
  });

  test('ingests fixture URL and shows post detail with scores', async ({ page }) => {
    const uniqueUrl = `https://www.threads.net/@youpd_fixture/post/C0FIXTURE${Date.now()}`;

    await page.goto(`${BASE_URL}/social`);
    await page.getByPlaceholder('https://www.threads.net/...').fill(uniqueUrl);
    await page.getByRole('button', { name: '저장' }).click();

    await expect(page).toHaveURL(/\/social\/posts\//, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /@youpd_fixture/ })).toBeVisible();
    await expect(
      page.getByText('Fixture thread post for local social ingest'),
    ).toBeVisible();
    await expect(page.getByText('점수')).toBeVisible();
    await expect(page.getByRole('button', { name: '레퍼런스에 저장' })).toBeVisible();

    await page.screenshot({
      path: 'test-results/social-post-detail.png',
      fullPage: true,
    });
  });

  test('saves social post into reference folder', async ({ page }) => {
    const groupTitle = `S9 social ref ${Date.now()}`;
    const ingestUrl = `https://www.threads.net/@youpd_fixture/post/C0REF${Date.now()}`;

    await page.goto(`${BASE_URL}/references`);
    await page.getByLabel('제목').fill(groupTitle);
    await page.getByLabel('타깃').fill('S9 VERF');
    await page.getByLabel('시드 테마').fill('social evidence');
    await page.getByLabel('기획 의도').fill('S9 VERF reference save');
    await page.getByRole('button', { name: '그룹 만들기' }).click();
    const groupLink = page.getByRole('link', { name: groupTitle });
    await expect(groupLink).toBeVisible({ timeout: 15_000 });
    await groupLink.click();

    const folderLink = page.getByRole('link', { name: '문제 인식' });
    await expect(folderLink).toBeVisible({ timeout: 15_000 });
    const folderHref = await folderLink.getAttribute('href');
    expect(folderHref).toMatch(/\/references\/folders\//);

    await page.goto(`${BASE_URL}/social`);
    await page.getByPlaceholder('https://www.threads.net/...').fill(ingestUrl);
    await page.getByRole('button', { name: '저장' }).click();
    await expect(page).toHaveURL(/\/social\/posts\//, { timeout: 15_000 });

    const saveDialog = page.getByRole('dialog', {
      name: '소셜 포스트를 레퍼런스 폴더에 저장',
    });
    await page.getByRole('button', { name: '레퍼런스에 저장' }).click();
    await saveDialog.getByRole('combobox', { name: '폴더' }).click();
    await page
      .getByRole('option', { name: new RegExp(`${groupTitle}.*문제 인식`) })
      .click();
    await saveDialog.getByRole('button', { name: '저장' }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10_000 });

    await page.goto(`${BASE_URL}${folderHref}`);
    await expect(
      page.getByRole('link', { name: '@youpd_fixture' }),
    ).toBeVisible({ timeout: 15_000 });

    await page.screenshot({
      path: 'test-results/social-folder-evidence.png',
      fullPage: true,
    });
  });

  test('social API covers sources, ingest-url, and manual fallback', async ({
    request,
  }) => {
    const sourcesRes = await request.get(`${BASE_URL}/api/social/sources`);
    expect(sourcesRes.ok()).toBeTruthy();
    const sources = (await sourcesRes.json()) as {
      sources: Array<{ provider: string; connectionStatus: string }>;
    };
    const threads = sources.sources.find((s) => s.provider === 'threads');
    expect(threads?.connectionStatus).toBe('not_configured');

    const ingestRes = await request.post(`${BASE_URL}/api/social/ingest-url`, {
      data: { url: FIXTURE_THREADS_URL },
    });
    expect(ingestRes.status(), await ingestRes.text()).toBe(201);
    const ingested = (await ingestRes.json()) as { post: { id: string } };
    expect(ingested.post.id).toBeTruthy();

    const manualRes = await request.post(`${BASE_URL}/api/social/ingest-manual`, {
      data: {
        permalink: `https://www.threads.net/@s9_manual/post/${Date.now()}`,
        authorHandle: 's9_manual',
        textContent: 'S9 VERF manual ingest path',
        metrics: { likeCount: 10 },
      },
    });
    expect(manualRes.status(), await manualRes.text()).toBe(201);
    const manual = (await manualRes.json()) as { post: { ingestMode: string } };
    expect(manual.post.ingestMode).toBe('manual');
  });
});
