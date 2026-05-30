import { expect, test } from '@playwright/test';

const WEB_PORT = Number(process.env.WEB_PORT ?? 3000);
const BASE_URL = `http://127.0.0.1:${WEB_PORT}`;

test.describe('home dashboard', () => {
  test('root redirects to /home', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/`, { maxRedirects: 0 });
    expect(response.status()).toBeGreaterThanOrEqual(300);
    expect(response.status()).toBeLessThan(400);
    expect(response.headers().location).toMatch(/\/home$/);
  });

  test('sidebar navigates to keywords and hot candidates', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`);
    await expect(
      page.getByRole('heading', { name: 'Planning Recommendation Feed' }),
    ).toBeVisible();

    await page.getByRole('link', { name: 'Keyword Search' }).click();
    await expect(page).toHaveURL(/\/keywords/);
    await expect(page.getByRole('heading', { name: 'Keyword Harvest' })).toBeVisible();

    await page.getByRole('link', { name: 'Hot Candidates' }).click();
    await expect(page).toHaveURL(/\/hot-videos/);
    await expect(
      page.locator('header').getByText('Hot Videos', { exact: true }),
    ).toBeVisible();

    await page.screenshot({
      path: 'test-results/home-sidebar-navigation.png',
      fullPage: true,
    });
  });

  test('onboarding shows fixture probe cards', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`);
    await page.getByLabel('관심 주제').fill('엑셀 자동화, 노션 운영');
    await page
      .getByLabel('채널 설명')
      .fill('직장인 생산성·1인 크리에이터 운영 채널');
    await page.getByRole('button', { name: '프로브 추천 받기' }).click();

    await expect(page.getByText('직장인 엑셀·반복 업무 레퍼런스 풀')).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText('입력하신 관심 주제와 채널 설명에서', { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText('동일 고객군·문제 상황에서 강한 오프닝', { exact: false }),
    ).toBeVisible();

    await page.screenshot({
      path: 'test-results/home-feed-populated.png',
      fullPage: true,
    });
  });
});
