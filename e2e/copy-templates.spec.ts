import { expect, test } from '@playwright/test';

const WEB_PORT = Number(process.env.WEB_PORT ?? 3000);
const BASE_URL = `http://127.0.0.1:${WEB_PORT}`;

test.describe('copy template library (S7)', () => {
  test('sidebar opens library with seeded copy templates', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`);
    await page.getByRole('link', { name: 'Copy Templates' }).click();
    await expect(page).toHaveURL(/\/copy-templates$/);
    await expect(
      page.getByRole('heading', { level: 1, name: '카피 템플릿 라이브러리' }),
    ).toBeVisible();
    await expect(page.getByText('호기심 갭 · 콜론 2단')).toBeVisible();
    await expect(page.getByText(/제목 증거 \d+개/).first()).toBeVisible();

    await page.screenshot({
      path: 'test-results/copy-templates-library.png',
      fullPage: true,
    });
  });

  test('hook filter narrows template list', async ({ page }) => {
    await page.goto(`${BASE_URL}/copy-templates`);
    await page.getByRole('link', { name: '호기심 갭', exact: true }).click();
    await expect(page).toHaveURL(/hookType=curiosity_gap/);
    await expect(page.getByText('호기심 갭 · 콜론 2단')).toBeVisible();

    await page.screenshot({
      path: 'test-results/copy-templates-hook-filter.png',
      fullPage: true,
    });
  });

  test('detail separates title evidence from reusable template structure', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/copy-templates`);
    await page.getByRole('link', { name: '호기심 갭 · 콜론 2단' }).click();
    await expect(page.getByRole('heading', { name: '호기심 갭 · 콜론 2단' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '문장 스켈레톤' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '슬롯 채우기' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /제목 증거/ })).toBeVisible();
    await expect(page.getByText('이 방법 모르면 손해')).toBeVisible();
    await expect(page.getByRole('heading', { name: '예시' })).toBeVisible();

    await page.screenshot({
      path: 'test-results/copy-templates-detail.png',
      fullPage: true,
    });
  });

  test('fill slots returns deterministic preview', async ({ page }) => {
    await page.goto(`${BASE_URL}/copy-templates`);
    await page.getByRole('link', { name: '호기심 갭 · 콜론 2단' }).click();
    await page.getByLabel('주제 *').fill('유튜브 알고리즘');
    await page.getByLabel('약속 *').fill('30일 실험 결과');
    await page.getByLabel('증거 *').fill('CTR +42%');
    await page.getByRole('button', { name: '슬롯 채우기' }).click();
    await expect(
      page.getByText('유튜브 알고리즘: 30일 실험 결과 (CTR +42%)'),
    ).toBeVisible();

    await page.screenshot({
      path: 'test-results/copy-templates-fill-preview.png',
      fullPage: true,
    });
  });

  test('thumbnail pairing link includes copyTemplateId', async ({ page }) => {
    await page.goto(`${BASE_URL}/copy-templates`);
    await page.getByRole('link', { name: '호기심 갭 · 콜론 2단' }).click();
    await page.getByRole('link', { name: '이 구조 + 썸네일로 제작' }).click();
    await expect(page).toHaveURL(/\/thumbnail-create\?templateId=.+&copyTemplateId=/);

    await page.screenshot({
      path: 'test-results/copy-templates-thumbnail-pairing.png',
      fullPage: true,
    });
  });

  test('copy-templates API lists catalog with evidence counts', async ({ request }) => {
    const categoriesRes = await request.get(`${BASE_URL}/api/copy-templates/categories`);
    expect(categoriesRes.ok()).toBeTruthy();
    const categories = (await categoriesRes.json()) as {
      categories: Array<{ code: string; templateCount: number }>;
    };
    expect(categories.categories.some((c) => c.code === 'curiosity-gap')).toBe(true);

    const listRes = await request.get(
      `${BASE_URL}/api/copy-templates?hookType=curiosity_gap&limit=5`,
    );
    expect(listRes.ok()).toBeTruthy();
    const list = (await listRes.json()) as {
      templates: Array<{ id: string; referenceCount: number; pairedThumbnailCount: number }>;
    };
    expect(list.templates.length).toBeGreaterThanOrEqual(1);
    const first = list.templates[0]!;
    expect(first.referenceCount).toBeGreaterThanOrEqual(1);

    const detailRes = await request.get(`${BASE_URL}/api/copy-templates/${first.id}`);
    expect(detailRes.ok()).toBeTruthy();
    const detail = (await detailRes.json()) as {
      skeleton: { pattern: string };
      slotSchema: { slots: unknown[] };
      titleEvidence: unknown[];
      examples: unknown[];
    };
    expect(detail.skeleton.pattern).toContain('{{');
    expect(detail.slotSchema.slots.length).toBeGreaterThan(0);
    expect(detail.titleEvidence.length).toBeGreaterThanOrEqual(1);
    expect(detail.examples.length).toBeGreaterThanOrEqual(0);
  });
});
