import { describe, expect, it } from 'vitest';
import {
  generateIntroForTemplate,
  getIntroTemplateDetail,
  listIntroTemplateCategories,
  listIntroTemplates,
} from './intro-templates-service';

describe('intro templates (integration)', () => {
  it('lists published intro templates with detail and generate', async () => {
    const categories = await listIntroTemplateCategories();
    expect(categories.length).toBeGreaterThanOrEqual(3);

    const problem = categories.find((c) => c.code === 'problem-solution');
    expect(problem).toBeDefined();

    const list = await listIntroTemplates({
      category: 'problem-solution',
      limit: 10,
    });
    expect(list.templates.length).toBeGreaterThanOrEqual(1);

    const first = list.templates[0]!;
    expect(first.referenceCount).toBeGreaterThanOrEqual(1);
    expect(first.slotOrderPreview.length).toBeGreaterThan(0);

    const detail = await getIntroTemplateDetail(first.id);
    expect(detail.skeleton.slotOrder.length).toBeGreaterThan(0);
    expect(detail.slotSchema.slots.length).toBeGreaterThan(0);
    expect(detail.evidence.length).toBeGreaterThanOrEqual(1);

    const generated = await generateIntroForTemplate(
      first.id,
      '00000000-0000-4000-8000-000000000099',
      { userBrief: '테스트 브리프: 알고리즘 실험 결과를 공유합니다.' },
    );
    expect(generated.status).toBe('succeeded');
    expect(generated.draftText?.length).toBeGreaterThan(0);
    expect(generated.lineage.introTemplateId).toBe(first.id);
  });
});
