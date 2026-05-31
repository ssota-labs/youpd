import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  createThumbnailGenerationJob,
  getThumbnailCreateBootstrap,
  upsertThumbnailCreateDraft,
} from './thumbnail-generation-service';
import { listThumbnailTemplates } from '../thumbnail-templates/thumbnail-templates-service';

const testUserId = randomUUID();

describe('thumbnail generation (integration)', () => {
  it('draft roundtrip and stub job create', async () => {
    const list = await listThumbnailTemplates({ limit: 1 });
    const templateId = list.templates[0]?.id;
    expect(templateId).toBeDefined();

    const bootstrap = await getThumbnailCreateBootstrap({
      userId: testUserId,
      templateId: templateId!,
    });
    expect(bootstrap.template.id).toBe(templateId);

    const headlineSlot = bootstrap.template.slotSchema.slots.find(
      (s) => s.type === 'text',
    );
    expect(headlineSlot).toBeDefined();

    const slotValues = {
      version: 1 as const,
      values: { [headlineSlot!.key]: 'integration-test' },
    };
    for (const slot of bootstrap.template.slotSchema.slots) {
      if (slot.key === headlineSlot!.key) continue;
      if (slot.type === 'number') {
        slotValues.values[slot.key] = 42;
      } else {
        slotValues.values[slot.key] = 'fill';
      }
    }

    const draft = await upsertThumbnailCreateDraft({
      userId: testUserId,
      body: { templateId: templateId!, slotValues },
    });
    expect(draft.draftId).toBeTruthy();

    const job = await createThumbnailGenerationJob({
      userId: testUserId,
      body: { templateId: templateId!, slotValues, draftId: draft.draftId },
    });
    expect(job.status).toBe('succeeded');
    expect(job.assets.length).toBeGreaterThanOrEqual(1);
    expect(job.assets[0]?.lineage.promptHash.length).toBe(64);
  });
});
