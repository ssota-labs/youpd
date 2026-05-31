import { expect, test } from '@playwright/test';

const WEB_PORT = Number(process.env.WEB_PORT ?? 3000);
const BASE_URL = `http://127.0.0.1:${WEB_PORT}`;

test.describe('thumbnail template library', () => {
  test('sidebar opens library with seeded templates', async ({ page }) => {
    await page.goto(`${BASE_URL}/home`);
    await page.getByRole('link', { name: 'Thumbnail Library' }).click();
    await expect(page).toHaveURL(/\/thumbnail-templates$/);
    await expect(
      page.getByRole('heading', { level: 1, name: '썸네일 템플릿 라이브러리' }),
    ).toBeVisible();
    await expect(page.getByText('고대비 헤드라인')).toBeVisible();

    await page.screenshot({
      path: 'test-results/thumbnail-templates-library.png',
      fullPage: true,
    });
  });

  test('category filter narrows template list', async ({ page }) => {
    await page.goto(`${BASE_URL}/thumbnail-templates`);
    // Sidebar category link includes count badge; template cards also prefix category name.
    await page.getByRole('link', { name: /^대비 강조 \d+$/ }).click();
    await expect(page).toHaveURL(/category=contrast/);
    await expect(page.getByText('고대비 헤드라인')).toBeVisible();

    await page.screenshot({
      path: 'test-results/thumbnail-templates-category-filter.png',
      fullPage: true,
    });
  });

  test('detail shows skeleton, slots, evidence, and create CTA', async ({ page }) => {
    await page.goto(`${BASE_URL}/thumbnail-templates`);
    await page.getByRole('link', { name: '고대비 헤드라인' }).click();
    await expect(page.getByRole('heading', { name: '고대비 헤드라인' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '스켈레톤' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '슬롯' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /레퍼런스 증거/ })).toBeVisible();
    await expect(
      page.getByRole('link', { name: '이 템플릿으로 썸네일 제작' }),
    ).toHaveAttribute('href', /\/thumbnail-create\?templateId=/);

    await page.screenshot({
      path: 'test-results/thumbnail-templates-detail.png',
      fullPage: true,
    });
  });

  test('create route receives templateId from detail CTA', async ({ page }) => {
    await page.goto(`${BASE_URL}/thumbnail-templates`);
    await page.getByRole('link', { name: '고대비 헤드라인' }).click();
    await page.getByRole('link', { name: '이 템플릿으로 썸네일 제작' }).click();
    await expect(page).toHaveURL(/\/thumbnail-create\?templateId=/);
    await expect(page.getByText('선택된 템플릿 ID:')).toBeVisible();

    await page.screenshot({
      path: 'test-results/thumbnail-templates-create-prefill.png',
      fullPage: true,
    });
  });

  test('thumbnail-templates API lists published catalog', async ({ request }) => {
    const categoriesRes = await request.get(`${BASE_URL}/api/thumbnail-templates/categories`);
    expect(categoriesRes.ok()).toBeTruthy();
    const categories = (await categoriesRes.json()) as {
      categories: Array<{ code: string; templateCount: number }>;
    };
    expect(categories.categories.some((c) => c.code === 'contrast')).toBe(true);

    const listRes = await request.get(
      `${BASE_URL}/api/thumbnail-templates?category=contrast&limit=5`,
    );
    expect(listRes.ok()).toBeTruthy();
    const list = (await listRes.json()) as {
      templates: Array<{ id: string; code: string; referenceCount: number }>;
    };
    expect(list.templates.length).toBeGreaterThanOrEqual(1);
    const first = list.templates[0]!;
    expect(first.referenceCount).toBeGreaterThanOrEqual(1);

    const detailRes = await request.get(
      `${BASE_URL}/api/thumbnail-templates/${first.id}`,
    );
    expect(detailRes.ok()).toBeTruthy();
    const detail = (await detailRes.json()) as {
      skeleton: { regions: unknown[] };
      slotSchema: { slots: unknown[] };
      references: unknown[];
      promptScaffold: string;
    };
    expect(detail.skeleton.regions.length).toBeGreaterThan(0);
    expect(detail.slotSchema.slots.length).toBeGreaterThan(0);
    expect(detail.references.length).toBeGreaterThanOrEqual(1);
    expect(detail.promptScaffold.length).toBeGreaterThan(0);
  });
});
