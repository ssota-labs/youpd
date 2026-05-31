import { describe, expect, it } from 'vitest';
import {
  getThumbnailTemplateDetail,
  listThumbnailTemplateCategories,
  listThumbnailTemplates,
} from './thumbnail-templates-service';

describe('thumbnail templates (integration)', () => {
  it('lists published templates with category filter and detail references', async () => {
    const categories = await listThumbnailTemplateCategories();
    expect(categories.length).toBeGreaterThanOrEqual(3);

    const contrast = categories.find((c) => c.code === 'contrast');
    expect(contrast).toBeDefined();
    expect(contrast!.templateCount).toBeGreaterThanOrEqual(1);

    const list = await listThumbnailTemplates({
      category: 'contrast',
      limit: 10,
    });
    expect(list.templates.length).toBeGreaterThanOrEqual(1);
    const first = list.templates[0]!;
    expect(first.referenceCount).toBeGreaterThanOrEqual(1);

    const detail = await getThumbnailTemplateDetail(first.id);
    expect(detail.skeleton.regions.length).toBeGreaterThan(0);
    expect(detail.slotSchema.slots.length).toBeGreaterThan(0);
    expect(detail.references.length).toBeGreaterThanOrEqual(1);
    expect(detail.promptScaffold.length).toBeGreaterThan(0);
  });

  it('excludes draft templates from public list', async () => {
    const all = await listThumbnailTemplates({ limit: 50 });
    expect(all.templates.every((t) => t.code !== 'draft-only-fixture')).toBe(
      true,
    );
  });
});
