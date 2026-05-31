import { expect, test } from '@playwright/test';

const WEB_PORT = Number(process.env.WEB_PORT ?? 3000);
const BASE_URL = `http://127.0.0.1:${WEB_PORT}`;

test.describe('intro template library (S8)', () => {
  test('sidebar opens library with seeded intro templates', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`);
    await page.getByRole('link', { name: 'Intro Templates' }).click();
    await expect(page).toHaveURL(/\/intro-templates$/);
    await expect(
      page.getByRole('heading', { level: 1, name: '인트로 구조 템플릿' }),
    ).toBeVisible();
    await expect(page.getByText('문제 → 긴장 → 약속')).toBeVisible();
    await expect(page.getByText(/인트로 증거 \d+개/).first()).toBeVisible();

    await page.screenshot({
      path: 'test-results/intro-templates-library.png',
      fullPage: true,
    });
  });

  test('detail shows slot order and reference evidence', async ({ page }) => {
    await page.goto(`${BASE_URL}/intro-templates`);
    await page.getByRole('link', { name: '문제 → 긴장 → 약속' }).click();
    await expect(
      page.getByRole('heading', { name: '문제 → 긴장 → 약속' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: '슬롯 순서' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '레퍼런스 인트로 증거' })).toBeVisible();
    await expect(page.getByText('유튜브 알고리즘, 솔직히 모르시는 분 많죠?')).toBeVisible();

    await page.screenshot({
      path: 'test-results/intro-templates-detail.png',
      fullPage: true,
    });
  });

  test('generate intro returns deterministic draft from brief', async ({ page }) => {
    await page.goto(`${BASE_URL}/intro-templates`);
    await page.getByRole('link', { name: '문제 → 긴장 → 약속' }).click();
    await page.getByLabel('이번 영상 브리프').fill('유튜브 CTR 실험을 공유합니다.');
    await page.getByRole('button', { name: '인트로 초안 생성' }).click();
    await expect(page.getByText('【상황】')).toBeVisible({ timeout: 15_000 });

    await page.screenshot({
      path: 'test-results/intro-templates-generate.png',
      fullPage: true,
    });
  });
});
