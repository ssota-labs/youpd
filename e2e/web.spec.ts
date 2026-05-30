import { expect, test } from '@playwright/test';
import {
  buildBrokenDefaultFilterUrl,
  E2E_HOT_VIDEO_TITLES,
  getTodayInKorea,
} from './hot-videos-fixtures';

const WEB_PORT = Number(process.env.WEB_PORT ?? 3000);
const BASE_URL = `http://127.0.0.1:${WEB_PORT}`;

async function expectSeededHotVideos(page: import('@playwright/test').Page) {
  await expect(page.getByText(E2E_HOT_VIDEO_TITLES.gaming)).toBeVisible();
  await expect(page.getByText(E2E_HOT_VIDEO_TITLES.vlog)).toBeVisible();
  await expect(
    page.getByText('조건에 맞는 핫비디오가 없습니다'),
  ).not.toBeVisible();
}

test.describe('apps/web', () => {
  test('root redirects to home', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/`, { maxRedirects: 0 });
    expect(response.status()).toBeGreaterThanOrEqual(300);
    expect(response.status()).toBeLessThan(400);
    expect(response.headers().location).toMatch(/\/home$/);
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
    await expect(
      page.locator('header').getByText('Hot Videos', { exact: true }),
    ).toBeVisible();
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
    await expect(
      page.locator('header').getByText('Hot Videos', { exact: true }),
    ).toBeVisible();
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

  test('hot videos bare page shows seeded results', async ({ page }) => {
    await page.goto(`${BASE_URL}/hot-videos`);
    await expectSeededHotVideos(page);

    await page.screenshot({
      path: 'test-results/hot-videos-seeded-default.png',
      fullPage: true,
    });
  });

  test('hot videos default filter URL with empty categoryId shows seeded results', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}${buildBrokenDefaultFilterUrl()}`);
    await expectSeededHotVideos(page);

    await page.screenshot({
      path: 'test-results/hot-videos-seeded-broken-filter-url.png',
      fullPage: true,
    });
  });

  test('hot videos filter form submit with all categories shows seeded results', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/hot-videos`);
    await page.getByRole('button', { name: '검색' }).click();

    await expect(page).toHaveURL(new RegExp(`date=${getTodayInKorea()}`));
    expect(page.url()).not.toMatch(/categoryId=$/);
    await expectSeededHotVideos(page);

    await page.screenshot({
      path: 'test-results/hot-videos-seeded-form-submit.png',
      fullPage: true,
    });
  });

  test('hot videos advanced filter dialog shows distribution charts', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/hot-videos`);
    await page.getByRole('button', { name: /상세 필터/ }).click();

    await expect(page.getByRole('dialog', { name: '상세 필터' })).toBeVisible();
    const dialog = page.getByRole('dialog', { name: '상세 필터' });
    await expect(dialog.getByText('조회수')).toBeVisible();
    await expect(dialog.getByText('영상 게시일')).toBeVisible();
    await expect(dialog.getByText('기여도')).toBeVisible();
    await expect(dialog.getByText('성과도')).toBeVisible();

    await page.screenshot({
      path: 'test-results/hot-videos-filter-dialog.png',
      fullPage: true,
    });
  });

  test('hot videos loads additional rows when scrolling near the bottom', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/hot-videos`);
    await expect(page.getByText(E2E_HOT_VIDEO_TITLES.gaming)).toBeVisible();
    await expect(page.getByText(E2E_HOT_VIDEO_TITLES.last)).not.toBeVisible();

    await page.getByText('스크롤하면 더 불러옵니다').scrollIntoViewIfNeeded();
    await expect(page.getByText(E2E_HOT_VIDEO_TITLES.last)).toBeVisible({
      timeout: 10_000,
    });

    await page.screenshot({
      path: 'test-results/hot-videos-infinite-scroll-loaded.png',
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
