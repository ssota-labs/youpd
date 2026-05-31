import { describe, expect, it } from 'vitest';
import {
  generateThreadForTemplate,
  getThreadTemplateDetail,
  listThreadTemplateCategories,
  listThreadTemplates,
} from './thread-templates-service';

describe('thread templates (integration)', () => {
  it('lists published thread templates with detail and generate', async () => {
    const categories = await listThreadTemplateCategories();
    expect(categories.length).toBeGreaterThanOrEqual(1);

    const list = await listThreadTemplates({ limit: 10 });
    expect(list.templates.length).toBeGreaterThanOrEqual(1);

    const first = list.templates[0]!;
    expect(first.referenceCount).toBeGreaterThanOrEqual(1);
    expect(first.slotOrderPreview.length).toBeGreaterThan(0);

    const detail = await getThreadTemplateDetail(first.id);
    expect(detail.skeleton.slotOrder.length).toBeGreaterThan(0);
    expect(detail.slotSchema.slots.length).toBeGreaterThan(0);
    expect(detail.evidence.length).toBeGreaterThanOrEqual(1);
    expect(detail.evidence[0]!.authorHandle.length).toBeGreaterThan(0);
    expect(detail.evidence[0]!.permalink.length).toBeGreaterThan(0);
    expect(detail.evidence[0]!.excerptText.length).toBeGreaterThan(0);

    const generated = await generateThreadForTemplate(
      first.id,
      '00000000-0000-4000-8000-000000000099',
      {
        topic: '테스트 주제: 스레드 초안을 생성합니다.',
        audience: '크리에이터',
      },
    );
    expect(generated.status).toBe('succeeded');
    expect(generated.draftText?.length).toBeGreaterThan(0);
    expect(generated.lineage.threadTemplateId).toBe(first.id);
  });
});
