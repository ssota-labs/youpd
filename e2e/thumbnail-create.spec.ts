import { expect, test } from '@playwright/test';

const WEB_PORT = Number(process.env.WEB_PORT ?? 3000);
const BASE_URL = `http://127.0.0.1:${WEB_PORT}`;

test.describe('slot-based thumbnail create (S6)', () => {
  test('create flow: slots, draft save, stub generation, lineage', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/thumbnail-templates`);
    await page.getByRole('link', { name: '고대비 헤드라인' }).click();
    await page.getByRole('link', { name: '이 템플릿으로 썸네일 제작' }).click();
    await expect(page).toHaveURL(/\/thumbnail-create\?templateId=/);
    await expect(page.getByRole('heading', { level: 1, name: '고대비 헤드라인' })).toBeVisible();

    await page.screenshot({
      path: 'test-results/thumbnail-create-bootstrap.png',
      fullPage: true,
    });

    const headline = page.getByLabel('헤드라인 *');
    await headline.fill('E2E 검증 헤드라인');

    await page.getByRole('button', { name: '초안 저장' }).click();
    await expect(page.getByRole('status')).toContainText('초안이 저장되었습니다');

    await page.screenshot({
      path: 'test-results/thumbnail-create-draft-saved.png',
      fullPage: true,
    });

    await page.getByRole('button', { name: '생성하기' }).click();
    await expect(page.getByRole('status')).toContainText('생성이 완료되었습니다', {
      timeout: 30_000,
    });
    await expect(page.getByRole('heading', { name: '생성 결과' })).toBeVisible();
    await expect(page.locator('figure img').first()).toBeVisible();
    await expect(page.getByText(/^stub$/)).toBeVisible();

    await page.screenshot({
      path: 'test-results/thumbnail-create-generation-result.png',
      fullPage: true,
    });
  });

  test('generation jobs API returns lineage for valid payload', async ({
    request,
  }) => {
    const listRes = await request.get(`${BASE_URL}/api/thumbnail-templates?limit=1`);
    expect(listRes.ok()).toBeTruthy();
    const list = (await listRes.json()) as {
      templates: Array<{ id: string }>;
    };
    const templateId = list.templates[0]?.id;
    expect(templateId).toBeDefined();

    const detailRes = await request.get(
      `${BASE_URL}/api/thumbnail-templates/${templateId}`,
    );
    expect(detailRes.ok()).toBeTruthy();
    const detail = (await detailRes.json()) as {
      slotSchema: { slots: Array<{ key: string; type: string }> };
    };

    const values: Record<string, string | number> = {};
    for (const slot of detail.slotSchema.slots) {
      values[slot.key] = slot.type === 'number' ? 99 : 'api-e2e';
    }

    const jobRes = await request.post(`${BASE_URL}/api/thumbnail-generation/jobs`, {
      data: {
        templateId,
        slotValues: { version: 1, values },
      },
    });
    expect(jobRes.ok()).toBeTruthy();
    const job = (await jobRes.json()) as {
      status: string;
      assets: Array<{ lineage: { promptHash: string; providerKey: string } }>;
    };
    expect(job.status).toBe('succeeded');
    expect(job.assets[0]?.lineage.promptHash).toHaveLength(64);
    expect(job.assets[0]?.lineage.providerKey).toBe('stub');
  });
});
