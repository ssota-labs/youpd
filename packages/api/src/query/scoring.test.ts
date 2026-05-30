import { describe, expect, it } from 'vitest';
import {
  buildHotCandidateExplanation,
  gradeAbsoluteViews,
  gradeRatio,
  lengthAdjustedScore,
  minGradeToRatioThreshold,
  recencyScoreFromPublishedAt,
  scoreVideo,
  scoreVideoV2,
} from './scoring';

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

describe('minGradeToRatioThreshold', () => {
  it('maps grade floors to ADR-022 ratio thresholds', () => {
    expect(minGradeToRatioThreshold('Good')).toBe(10);
    expect(minGradeToRatioThreshold('Great')).toBe(100);
    expect(minGradeToRatioThreshold('Unknown')).toBeNull();
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

describe('scoreVideoV2', () => {
  it('adds absolute views, recency, and rankScore', () => {
    const publishedAt = new Date('2026-05-20T00:00:00Z');
    const now = new Date('2026-05-30T00:00:00Z');
    const out = scoreVideoV2({
      viewCount: 1_000_000,
      subscriberCount: 50_000,
      averageViewCount: 25_000,
      durationSec: 300,
      publishedAt,
      now,
    });
    expect(out.policyVersion).toBe('youtube_score_v2');
    expect(out.absoluteViews.grade).toBe('Great');
    expect(out.recency.score).toBeGreaterThan(0);
    expect(out.rankScore).toBeGreaterThan(0);
    expect(out.highPerforming).toBe(true);
  });

  it('formats hot candidate explanation in Korean', () => {
    const summary = buildHotCandidateExplanation({
      keyword: '엑셀 자동화',
      keywordRank: 3,
      performanceGrade: 'Good',
      contributionGrade: 'Great',
      viewCount: 120_000,
    });
    expect(summary).toContain('엑셀 자동화');
    expect(summary).toContain('#3위');
    expect(summary).not.toContain('트렌딩');
  });
});

describe('gradeAbsoluteViews', () => {
  it('uses KR longform thresholds by default', () => {
    expect(gradeAbsoluteViews(5_000).grade).toBe('Worst');
    expect(gradeAbsoluteViews(250_000).grade).toBe('Good');
    expect(gradeAbsoluteViews(2_000_000).grade).toBe('Great');
  });
});

describe('recencyScoreFromPublishedAt', () => {
  it('decays with publish age', () => {
    const now = new Date('2026-05-30T00:00:00Z');
    const recent = recencyScoreFromPublishedAt('2026-05-28T00:00:00Z', now);
    const old = recencyScoreFromPublishedAt('2025-01-01T00:00:00Z', now);
    expect(recent.score).toBeGreaterThan(old.score ?? 0);
  });
});
