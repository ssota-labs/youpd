import { describe, expect, it } from 'vitest';
import { gradeRatio, lengthAdjustedScore, scoreVideo } from './scoring';

describe('gradeRatio', () => {
  it('uses the ADR-022 logarithmic buckets', () => {
    expect(gradeRatio(null)).toBe('Unknown');
    expect(gradeRatio(0.09)).toBe('Worst');
    expect(gradeRatio(0.1)).toBe('Bad');
    expect(gradeRatio(1)).toBe('Normal');
    expect(gradeRatio(10)).toBe('Good');
    expect(gradeRatio(100)).toBe('Great');
  });
});

describe('lengthAdjustedScore', () => {
  it('uses geometric mean and a bounded duration weight', () => {
    const out = lengthAdjustedScore({
      performanceRatio: 4,
      contributionRatio: 9,
      videoDurationSec: 60,
      referenceDurationSec: 600,
    });
    expect(out.baseScore).toBe(6);
    expect(out.weight).toBeGreaterThan(1);
    expect(out.weight).toBeLessThanOrEqual(2);
    expect(out.adjustedScore).toBeCloseTo(6 * out.weight);
  });

  it('returns null scores when either ratio is unknown', () => {
    const out = lengthAdjustedScore({
      performanceRatio: null,
      contributionRatio: 9,
      videoDurationSec: 60,
    });
    expect(out.baseScore).toBeNull();
    expect(out.adjustedScore).toBeNull();
    expect(out.weight).toBe(1);
  });
});

describe('scoreVideo', () => {
  it('computes performance, contribution, and high-performing flag', () => {
    const out = scoreVideo({
      viewCount: 1_000_000,
      subscriberCount: 50_000,
      averageViewCount: 25_000,
      durationSec: 300,
    });
    expect(out.performance.ratio).toBe(20);
    expect(out.performance.grade).toBe('Good');
    expect(out.contribution.ratio).toBe(40);
    expect(out.contribution.grade).toBe('Good');
    expect(out.highPerforming).toBe(true);
    expect(out.lengthAdjustment.adjustedScore).toBeGreaterThan(0);
  });
});
