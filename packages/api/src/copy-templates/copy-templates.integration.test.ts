import { describe, expect, it } from 'vitest';
import {
  fillCopyTemplate,
  getCopyTemplateDetail,
  listCopyTemplateCategories,
  listCopyTemplates,
} from './copy-templates-service';

describe('copy templates (integration)', () => {
  it('lists published copy templates with hook filter and detail', async () => {
    const categories = await listCopyTemplateCategories();
    expect(categories.length).toBeGreaterThanOrEqual(3);

    const curiosity = categories.find((c) => c.code === 'curiosity-gap');
    expect(curiosity).toBeDefined();

    const list = await listCopyTemplates({
      hookType: 'curiosity_gap',
      limit: 10,
    });
    expect(list.templates.length).toBeGreaterThanOrEqual(1);

    const first = list.templates[0]!;
    expect(first.referenceCount).toBeGreaterThanOrEqual(1);
    expect(first.pairedThumbnailCount).toBeGreaterThanOrEqual(0);

    const detail = await getCopyTemplateDetail(first.id);
    expect(detail.skeleton.pattern).toContain('{{');
    expect(detail.slotSchema.slots.length).toBeGreaterThan(0);
    expect(detail.titleEvidence.length).toBeGreaterThanOrEqual(1);
    expect(detail.examples.length).toBeGreaterThanOrEqual(0);
  });

  it('deterministic fill returns stable title', async () => {
    const list = await listCopyTemplates({ limit: 1 });
    const template = list.templates[0]!;
    const detail = await getCopyTemplateDetail(template.id);
    const firstSlot = detail.slotSchema.slots[0]!;
    const values: Record<string, string> = {};
    for (const slot of detail.slotSchema.slots) {
      values[slot.key] = `test-${slot.key}`;
    }

    const filled = await fillCopyTemplate(template.id, { slotValues: values });
    expect(filled.filledTitle.length).toBeGreaterThan(0);
    expect(filled.filledTitle).toContain(`test-${firstSlot.key}`);
  });
});
