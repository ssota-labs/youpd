import { expect, test } from '@playwright/test';

const WEB_PORT = Number(process.env.WEB_PORT ?? 3000);
const BASE_URL = `http://127.0.0.1:${WEB_PORT}`;

/** Seeded transcript + youtube_videos row (S8 migration). */
const SEED_VIDEO_ID = 's5-seed-video-01';

function seedHotCandidate(videoId: string, title: string) {
  return {
    videoId,
    title,
    channelTitle: 'S8 E2E Channel',
    viewCount: 120_000,
    isShort: false,
    score: {
      performance: { ratio: 2.4, grade: 'Great' },
      contribution: { ratio: 1.9, grade: 'Good' },
      lengthAdjustment: {
        baseScore: 1,
        durationSec: 600,
        referenceDurationSec: 600,
        weight: 1,
        adjustedScore: 1,
      },
      highPerforming: true,
      policyVersion: 'youtube_score_v2',
      absoluteViews: { viewCount: 120_000, grade: 'Good', multiplier: 1 },
      recency: { daysSincePublish: 3, score: 0.95, label: 'recent' },
      rankScore: 18,
    },
    lineage: {
      probeId: '00000000-0000-4000-8000-000000000001',
      harvestId: '00000000-0000-4000-8000-000000000002',
      keyword: 'S8 VERF intro extract',
      keywordRank: 1,
      policyVersion: 'youtube_score_v2',
    },
    explanation: {
      summary: 'E2E intro extract fixture',
      performanceGrade: 'Great',
      contributionGrade: 'Good',
      absoluteViewGrade: 'Good',
    },
    poolSource: 'keyword',
  };
}

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

  test('category filter narrows intro template list', async ({ page }) => {
    await page.goto(`${BASE_URL}/intro-templates`);
    await page.getByRole('link', { name: /^문제·해결 \d+$/ }).click();
    await expect(page).toHaveURL(/category=problem-solution/);
    await expect(page.getByText('문제 → 긴장 → 약속')).toBeVisible();

    await page.screenshot({
      path: 'test-results/intro-templates-category-filter.png',
      fullPage: true,
    });
  });

  test('reference folder extracts intro structure from transcript', async ({
    page,
    request,
  }) => {
    const title = `S8 VERF 레퍼런스 ${Date.now()}`;
    const createRes = await request.post(`${BASE_URL}/api/reference-groups`, {
      data: {
        title,
        audience: '1인 크리에이터',
        seedTheme: '인트로 구조',
        intentSummary: 'S8 VERF intro extract E2E',
        seedStageFolders: true,
      },
    });
    expect(createRes.status(), await createRes.text()).toBe(201);
    const created = (await createRes.json()) as {
      id: string;
      folders: Array<{ id: string; name: string }>;
    };
    const folder = created.folders.find((f) => f.name === '문제 인식');
    expect(folder).toBeDefined();

    const addRes = await request.post(
      `${BASE_URL}/api/reference-folders/${folder!.id}/videos`,
      {
        data: {
          hotCandidate: seedHotCandidate(
            SEED_VIDEO_ID,
            '유튜브 알고리즘, 솔직히 모르시는 분 많죠?',
          ),
          saveReason: 'S8 VERF intro extract',
        },
      },
    );
    expect(addRes.status(), await addRes.text()).toBe(201);
    const added = (await addRes.json()) as { item: { id: string } };

    const extractRes = await request.post(
      `${BASE_URL}/api/reference-folders/${folder!.id}/videos/${added.item.id}/intro-segments/extract`,
    );
    expect(extractRes.status(), await extractRes.text()).toBe(200);
    const segment = (await extractRes.json()) as {
      excerptText: string;
      sourceMode: string;
      structureSlots: Record<string, string>;
    };
    expect(segment.sourceMode).toBe('extracted');
    expect(segment.excerptText).toContain('유튜브 알고리즘');
    expect(segment.structureSlots.situation).toBeTruthy();

    await page.goto(`${BASE_URL}/references/folders/${folder!.id}`);
    await expect(page.getByText('유튜브 알고리즘, 솔직히 모르시는 분 많죠?')).toBeVisible();
    await page.getByRole('button', { name: '인트로 구조 추출' }).click();
    await expect(page.getByText('인트로 구조를 추출했습니다.')).toBeVisible({
      timeout: 15_000,
    });

    await page.screenshot({
      path: 'test-results/intro-templates-folder-extract.png',
      fullPage: true,
    });
  });

  test('intro-templates API lists catalog with evidence and generate', async ({
    request,
  }) => {
    const categoriesRes = await request.get(`${BASE_URL}/api/intro-templates/categories`);
    expect(categoriesRes.ok()).toBeTruthy();
    const categories = (await categoriesRes.json()) as {
      categories: Array<{ code: string; templateCount: number }>;
    };
    expect(categories.categories.some((c) => c.code === 'problem-solution')).toBe(
      true,
    );

    const listRes = await request.get(
      `${BASE_URL}/api/intro-templates?category=problem-solution&limit=5`,
    );
    expect(listRes.ok()).toBeTruthy();
    const list = (await listRes.json()) as {
      templates: Array<{ id: string; referenceCount: number; slotOrderPreview: string[] }>;
    };
    expect(list.templates.length).toBeGreaterThanOrEqual(1);
    const first = list.templates[0]!;
    expect(first.referenceCount).toBeGreaterThanOrEqual(1);
    expect(first.slotOrderPreview.length).toBeGreaterThan(0);

    const detailRes = await request.get(`${BASE_URL}/api/intro-templates/${first.id}`);
    expect(detailRes.ok()).toBeTruthy();
    const detail = (await detailRes.json()) as {
      skeleton: { slotOrder: string[] };
      slotSchema: { slots: unknown[] };
      evidence: unknown[];
    };
    expect(detail.skeleton.slotOrder.length).toBeGreaterThan(0);
    expect(detail.slotSchema.slots.length).toBeGreaterThan(0);
    expect(detail.evidence.length).toBeGreaterThanOrEqual(1);

    const generateRes = await request.post(
      `${BASE_URL}/api/intro-templates/${first.id}/generate`,
      { data: { userBrief: 'S8 VERF API generate check' } },
    );
    expect(generateRes.ok()).toBeTruthy();
    const generated = (await generateRes.json()) as { status: string; draftText: string };
    expect(generated.status).toBe('succeeded');
    expect(generated.draftText.length).toBeGreaterThan(0);
  });
});
