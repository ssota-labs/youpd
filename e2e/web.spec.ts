import { expect, test } from '@playwright/test';

const WEB_PORT = Number(process.env.WEB_PORT ?? 3000);
const BASE_URL = `http://127.0.0.1:${WEB_PORT}`;

function getTodayInKorea(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

test.describe('apps/web', () => {
  test('root page responds', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/`);
    expect(response.status(), await response.text()).toBe(200);
  });

  test('hot videos page responds via API', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/hot-videos?view=list&q=test&categoryId=20`,
    );
    expect(response.status(), await response.text()).toBe(200);
    const html = await response.text();
    expect(html).toContain('Hot Videos');
    expect(html).toContain('핫비디오');
  });

  test('hot videos page renders grid view with filters', async ({ page }) => {
    const today = getTodayInKorea();

    await page.goto(`${BASE_URL}/hot-videos`);
    await expect(page.getByText('Hot Videos')).toBeVisible();
    await expect(page.getByLabel('영상 / 채널 검색')).toBeVisible();
    await expect(page.getByLabel('날짜')).toBeVisible();
    await expect(page.getByLabel('날짜')).toHaveValue(today);
    await expect(page.getByLabel('카테고리')).toBeVisible();
    await expect(page.getByRole('link', { name: '그리드' })).toBeVisible();
    await expect(page.getByRole('link', { name: '리스트' })).toBeVisible();

    await page.screenshot({
      path: 'test-results/hot-videos-grid-default.png',
      fullPage: true,
    });
  });

  test('hot videos page switches to list view via URL', async ({ page }) => {
    await page.goto(`${BASE_URL}/hot-videos?view=list&categoryId=20`);
    await expect(page.getByText('Hot Videos')).toBeVisible();
    await expect(page.getByRole('link', { name: '리스트' })).toHaveClass(/bg-primary/);

    await page.screenshot({
      path: 'test-results/hot-videos-list-view.png',
      fullPage: true,
    });
  });

  test('hot videos search form submits with query params', async ({ page }) => {
    const today = getTodayInKorea();

    await page.goto(`${BASE_URL}/hot-videos?categoryId=20`);
    await page.getByLabel('영상 / 채널 검색').fill('게임');
    await page.getByRole('button', { name: '검색' }).click();

    await page.waitForURL(/q=%EA%B2%8C%EC%9E%84/);
    expect(page.url()).toContain('categoryId=20');
    expect(page.url()).toContain(`date=${today}`);
    expect(page.url()).not.toContain('dateEnd=');
    await expect(page.getByText(/\d+ \/ \d+/)).toBeVisible();

    await page.screenshot({
      path: 'test-results/hot-videos-search-results.png',
      fullPage: true,
    });
  });

  test('hot videos sort chip updates URL with sort params', async ({ page }) => {
    const today = getTodayInKorea();

    await page.goto(`${BASE_URL}/hot-videos?categoryId=20`);
    await page.getByRole('link', { name: '조회수 정렬' }).click();

    await page.waitForURL(/sort=views/);
    expect(page.url()).toContain('order=desc');
    expect(page.url()).toContain(`date=${today}`);
    expect(page.url()).not.toContain('dateEnd=');
    await expect(page.getByRole('link', { name: '조회수 정렬 내림차순' })).toHaveClass(
      /bg-primary/,
    );

    await page.screenshot({
      path: 'test-results/hot-videos-sort-views.png',
      fullPage: true,
    });
  });
});
