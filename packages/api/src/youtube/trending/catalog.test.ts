import { describe, expect, it } from 'vitest';
import {
  KR_ASSIGNABLE_CATEGORY_IDS,
  listTrendingChartTargets,
} from './catalog';

describe('listTrendingChartTargets', () => {
  it('returns 14 KR assignable categories without overall (null category)', () => {
    const targets = listTrendingChartTargets();
    expect(targets).toHaveLength(14);
    expect(targets.every((t) => t.regionCode === 'KR')).toBe(true);
    expect(targets.every((t) => t.categoryId != null && t.categoryId.length > 0)).toBe(
      true,
    );
    expect(new Set(targets.map((t) => t.categoryId)).size).toBe(14);
    expect([...KR_ASSIGNABLE_CATEGORY_IDS].sort()).toEqual(
      targets.map((t) => t.categoryId).sort(),
    );
  });

  it('filters by categoryIds when provided', () => {
    const targets = listTrendingChartTargets({ categoryIds: ['22', '27'] });
    expect(targets).toHaveLength(2);
    expect(targets.map((t) => t.categoryId).sort()).toEqual(['22', '27']);
  });
});
