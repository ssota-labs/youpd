import type { ScoreGrade, SocialPostMetrics } from '@youpd/types';

export const SOCIAL_SCORE_POLICY_VERSION = 'social_score_v1' as const;

export type SocialScoreV1Result = {
  policyVersion: typeof SOCIAL_SCORE_POLICY_VERSION;
  performanceGrade: ScoreGrade;
  engagementGrade: ScoreGrade;
  recencyGrade: ScoreGrade;
  rankScore: number | null;
  scoreBreakdown: Record<string, unknown>;
};

function gradeFromRatio(ratio: number): ScoreGrade {
  if (ratio >= 1.5) return 'Great';
  if (ratio >= 1.1) return 'Good';
  if (ratio >= 0.7) return 'Normal';
  if (ratio >= 0.4) return 'Bad';
  return 'Worst';
}

function engagementTotal(metrics: SocialPostMetrics): number | null {
  const parts = [
    metrics.likeCount,
    metrics.replyCount,
    metrics.repostCount,
    metrics.quoteCount,
    metrics.bookmarkCount,
  ].filter((value): value is number => value !== undefined);
  if (parts.length === 0) return null;
  return parts.reduce((sum, value) => sum + value, 0);
}

function recencyGrade(publishedAt: Date | null): ScoreGrade {
  if (!publishedAt) return 'Unknown';
  const days = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 3) return 'Great';
  if (days <= 14) return 'Good';
  if (days <= 60) return 'Normal';
  if (days <= 180) return 'Bad';
  return 'Worst';
}

/** Provider-relative caps for fixture normalisation (not live API). */
const PROVIDER_ENGAGEMENT_CAPS: Record<string, number> = {
  threads: 2_000,
  x_bookmarks: 5_000,
  manual: 1_000,
};

export function computeSocialScoreV1(input: {
  metrics: SocialPostMetrics;
  provider: string;
  publishedAt: Date | null;
}): SocialScoreV1Result {
  const skipped: string[] = [];
  const total = engagementTotal(input.metrics);
  let engagementGrade: ScoreGrade = 'Unknown';
  let performanceGrade: ScoreGrade = 'Unknown';
  let rankScore: number | null = null;

  if (total === null) {
    skipped.push('engagement_total');
  } else {
    const cap =
      PROVIDER_ENGAGEMENT_CAPS[input.provider] ?? PROVIDER_ENGAGEMENT_CAPS.manual ?? 1000;
    const ratio = total / cap;
    engagementGrade = gradeFromRatio(ratio);
    performanceGrade = engagementGrade;

    const viewCount = input.metrics.viewCount;
    if (viewCount !== undefined) {
      const viewRatio = viewCount / (cap * 10);
      performanceGrade = gradeFromRatio((ratio + viewRatio) / 2);
      rankScore = Math.round((ratio * 10 + viewRatio * 5) * 10) / 10;
    } else {
      rankScore = Math.round(ratio * 100) / 10;
      skipped.push('view_count');
    }
  }

  const recency = recencyGrade(input.publishedAt);

  return {
    policyVersion: SOCIAL_SCORE_POLICY_VERSION,
    performanceGrade,
    engagementGrade,
    recencyGrade: recency,
    rankScore,
    scoreBreakdown: {
      skippedMetrics: skipped,
      engagementTotal: total,
      providerCap: PROVIDER_ENGAGEMENT_CAPS[input.provider] ?? null,
    },
  };
}
