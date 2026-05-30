import { describe, expect, it } from 'vitest';
import { mapSkillsStageToProduct } from './consumer-stage-map';

describe('mapSkillsStageToProduct', () => {
  it('maps youpd-skills labels to product enum', () => {
    expect(mapSkillsStageToProduct('phenomenon')).toBe('unaware');
    expect(mapSkillsStageToProduct('desire')).toBe('problem_aware');
    expect(mapSkillsStageToProduct('plan')).toBe('solution_aware');
    expect(mapSkillsStageToProduct('action')).toBe('product_aware');
    expect(mapSkillsStageToProduct('reward')).toBe('most_aware');
    expect(mapSkillsStageToProduct('mixed')).toBe('problem_aware');
  });

  it('passes through product enum values', () => {
    expect(mapSkillsStageToProduct('solution_aware')).toBe('solution_aware');
  });
});
