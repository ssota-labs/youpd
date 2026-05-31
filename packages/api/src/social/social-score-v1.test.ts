import { describe, expect, it } from 'vitest';
import { computeSocialScoreV1 } from './social-score-v1';

describe('computeSocialScoreV1', () => {
  it('skips unknown metrics without coercing to zero', () => {
    const result = computeSocialScoreV1({
      metrics: {},
      provider: 'threads',
      publishedAt: null,
    });
    expect(result.performanceGrade).toBe('Unknown');
    expect(result.engagementGrade).toBe('Unknown');
    expect(result.scoreBreakdown.skippedMetrics).toContain('engagement_total');
  });

  it('grades engagement when metrics are present', () => {
    const result = computeSocialScoreV1({
      metrics: { likeCount: 1500, replyCount: 80, viewCount: 25_000 },
      provider: 'threads',
      publishedAt: new Date(),
    });
    expect(result.engagementGrade).not.toBe('Unknown');
    expect(result.rankScore).not.toBeNull();
  });
});
