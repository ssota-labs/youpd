import { describe, expect, it } from 'vitest';
import {
  CreativeTemplateSlotSchemaJson,
  ThumbnailSkeletonSchema,
} from '@youpd/types';
import { maxPerformanceGrade } from './grade-utils';

describe('thumbnail template schemas', () => {
  it('rejects duplicate slot keys', () => {
    expect(() =>
      CreativeTemplateSlotSchemaJson.parse({
        version: 1,
        slots: [
          { key: 'headline', label: 'A', type: 'text', required: true },
          { key: 'headline', label: 'B', type: 'text', required: true },
        ],
      }),
    ).toThrow();
  });

  it('validates normalized skeleton boxes', () => {
    const parsed = ThumbnailSkeletonSchema.parse({
      version: 1,
      aspect: '16:9',
      regions: [
        {
          id: 'bg',
          role: 'background',
          box: { x: 0, y: 0, w: 1, h: 1 },
        },
      ],
    });
    expect(parsed.regions[0]?.box.w).toBe(1);
  });
});

describe('maxPerformanceGrade', () => {
  it('picks the highest grade from reference lineages', () => {
    expect(maxPerformanceGrade(['Normal', 'Great', 'Good'])).toBe('Great');
    expect(maxPerformanceGrade([null, undefined])).toBeNull();
  });
});
