import { describe, expect, it } from 'vitest';
import {
  CopySkeletonSchema,
  CreativeTemplateSlotSchemaJson,
  TitleObservedAxesSchema,
} from '@youpd/types';
import { CopyTemplateFillError, fillCopyTemplateSlots } from './fill-copy-slots';

describe('copy template fill', () => {
  const skeleton = CopySkeletonSchema.parse({
    version: 1,
    pattern: '{{topic}}: {{promise}} ({{proof}})',
    locale: 'ko',
  });

  const slotSchema = CreativeTemplateSlotSchemaJson.parse({
    version: 1,
    slots: [
      { key: 'topic', label: '주제', type: 'text', required: true },
      { key: 'promise', label: '약속', type: 'text', required: true },
      { key: 'proof', label: '증거', type: 'text', required: true },
    ],
  });

  it('fills all tokens deterministically', () => {
    const result = fillCopyTemplateSlots({
      skeletonJson: skeleton,
      slotSchemaJson: slotSchema,
      slotValues: {
        topic: '유튜브',
        promise: '30일 실험',
        proof: 'CTR +40%',
      },
    });
    expect(result.filledTitle).toBe('유튜브: 30일 실험 (CTR +40%)');
  });

  it('rejects missing required slots', () => {
    expect(() =>
      fillCopyTemplateSlots({
        skeletonJson: skeleton,
        slotSchemaJson: slotSchema,
        slotValues: { topic: 'only' },
      }),
    ).toThrow(CopyTemplateFillError);
  });

  it('validates title observed axes', () => {
    const parsed = TitleObservedAxesSchema.parse({
      hookType: 'curiosity_gap',
      titleShape: 'colon_two_part',
      tones: ['authoritative'],
    });
    expect(parsed.hookType).toBe('curiosity_gap');
  });
});
