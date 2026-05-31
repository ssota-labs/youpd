import { expect, test } from '@playwright/test';

const WEB_PORT = Number(process.env.WEB_PORT ?? 3000);
const BASE_URL = `http://127.0.0.1:${WEB_PORT}`;

const SEED_TEMPLATE_NAME = '반론 훅 · 통찰 · CTA';
const SEED_EVIDENCE_SNIPPET = '알고리즘 공부는 시간 낭비라고요?';

test.describe('thread template library (S10)', () => {
  test('sidebar opens library with seeded thread templates', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`);
    await page.getByRole('link', { name: 'Thread Templates' }).click();
    await expect(page).toHaveURL(/\/thread-templates$/);
    await expect(
      page.getByRole('heading', { level: 1, name: '스레드 템플릿' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: SEED_TEMPLATE_NAME })).toBeVisible();
    await expect(page.getByText(/소셜 증거 \d+개/).first()).toBeVisible();

    await page.screenshot({
      path: 'test-results/thread-templates-library.png',
      fullPage: true,
    });
  });

  test('detail shows slot order and social reference evidence', async ({ page }) => {
    await page.goto(`${BASE_URL}/thread-templates`);
    await page.getByRole('link', { name: SEED_TEMPLATE_NAME }).click();
    await expect(
      page.getByRole('heading', { name: SEED_TEMPLATE_NAME }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: '슬롯 순서' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '레퍼런스 소셜 증거' })).toBeVisible();
    await expect(page.getByText('@youpd_s10_seed')).toBeVisible();
    await expect(page.getByText(SEED_EVIDENCE_SNIPPET)).toBeVisible();
    await expect(page.getByRole('link', { name: '원문 보기' }).first()).toBeVisible();

    await page.screenshot({
      path: 'test-results/thread-templates-detail.png',
      fullPage: true,
    });
  });

  test('generate thread returns deterministic draft from topic', async ({ page }) => {
    await page.goto(`${BASE_URL}/thread-templates`);
    await page.getByRole('link', { name: SEED_TEMPLATE_NAME }).click();
    await page.getByLabel('주제').fill('유튜브 CTR 실험 결과를 스레드로 공유합니다.');
    await page.getByRole('button', { name: '스레드 초안 생성' }).click();
    await expect(page.getByText('【훅】')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('기본 뼈대')).toBeVisible();

    await page.screenshot({
      path: 'test-results/thread-templates-generate.png',
      fullPage: true,
    });
  });

  test('category filter narrows thread template list', async ({ page }) => {
    await page.goto(`${BASE_URL}/thread-templates`);
    await page.getByRole('link', { name: /^반론·주장 \d+$/ }).click();
    await expect(page).toHaveURL(/category=contrarian-take/);
    await expect(page.getByRole('link', { name: SEED_TEMPLATE_NAME })).toBeVisible();

    await page.screenshot({
      path: 'test-results/thread-templates-category-filter.png',
      fullPage: true,
    });
  });

  test('empty search shows manual fallback link to Social', async ({ page }) => {
    await page.goto(`${BASE_URL}/thread-templates?q=zzzz-no-thread-templates-e2e`);
    await expect(page.getByText('조건에 맞는 스레드 템플릿이 없습니다.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Social' })).toBeVisible();

    await page.screenshot({
      path: 'test-results/thread-templates-empty-fallback.png',
      fullPage: true,
    });
  });

  test('thread-templates API lists catalog with evidence and generate', async ({
    request,
  }) => {
    const categoriesRes = await request.get(`${BASE_URL}/api/thread-templates/categories`);
    expect(categoriesRes.ok()).toBeTruthy();
    const categories = (await categoriesRes.json()) as {
      categories: Array<{ code: string; templateCount: number }>;
    };
    expect(categories.categories.some((c) => c.code === 'contrarian-take')).toBe(
      true,
    );

    const listRes = await request.get(
      `${BASE_URL}/api/thread-templates?category=contrarian-take&limit=5`,
    );
    expect(listRes.ok()).toBeTruthy();
    const list = (await listRes.json()) as {
      templates: Array<{ id: string; referenceCount: number; slotOrderPreview: string[] }>;
    };
    expect(list.templates.length).toBeGreaterThanOrEqual(1);
    const first = list.templates[0]!;
    expect(first.referenceCount).toBeGreaterThanOrEqual(1);
    expect(first.slotOrderPreview.length).toBeGreaterThan(0);

    const detailRes = await request.get(`${BASE_URL}/api/thread-templates/${first.id}`);
    expect(detailRes.ok()).toBeTruthy();
    const detail = (await detailRes.json()) as {
      skeleton: { slotOrder: string[] };
      evidence: Array<{ authorHandle: string; excerptText: string }>;
    };
    expect(detail.skeleton.slotOrder.length).toBeGreaterThan(0);
    expect(detail.evidence.length).toBeGreaterThanOrEqual(1);
    expect(detail.evidence[0]!.authorHandle).toBeTruthy();

    const generateRes = await request.post(
      `${BASE_URL}/api/thread-templates/${first.id}/generate`,
      { data: { topic: 'S10 VERF API generate check' } },
    );
    expect(generateRes.ok()).toBeTruthy();
    const generated = (await generateRes.json()) as {
      status: string;
      draftText: string;
      lineage: { generator: string };
    };
    expect(generated.status).toBe('succeeded');
    expect(generated.draftText.length).toBeGreaterThan(0);
    expect(generated.lineage.generator).toBe('deterministic');
  });
});
