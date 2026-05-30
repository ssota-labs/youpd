export type ScoreGrade = 'Unknown' | 'Worst' | 'Bad' | 'Normal' | 'Good' | 'Great';

export type ScoreBundle = {
  performance: {
    ratio: number | null;
    grade: ScoreGrade;
  };
  contribution: {
    ratio: number | null;
    grade: ScoreGrade;
  };
  lengthAdjustment: {
    baseScore: number | null;
    durationSec: number | null;
    referenceDurationSec: number;
    weight: number;
    adjustedScore: number | null;
  };
  highPerforming: boolean;
};

export const SCORE_GRADES: ScoreGrade[] = [
  'Unknown',
  'Worst',
  'Bad',
  'Normal',
  'Good',
  'Great',
];

export function gradeRatio(ratio: number | null): ScoreGrade {
  if (ratio == null || !Number.isFinite(ratio)) return 'Unknown';
  if (ratio < 0.1) return 'Worst';
  if (ratio < 1) return 'Bad';
  if (ratio < 10) return 'Normal';
  if (ratio < 100) return 'Good';
  return 'Great';
}

export function isGoodOrGreat(grade: ScoreGrade): boolean {
  return grade === 'Good' || grade === 'Great';
}

/** Minimum ratio for a video to meet at least this grade (ADR-022 buckets). */
export function minGradeToRatioThreshold(grade: ScoreGrade): number | null {
  switch (grade) {
    case 'Great':
      return 100;
    case 'Good':
      return 10;
    case 'Normal':
      return 1;
    case 'Bad':
      return 0.1;
    case 'Worst':
      return 0;
    case 'Unknown':
      return null;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lengthAdjustedScore(args: {
  performanceRatio: number | null;
  contributionRatio: number | null;
  videoDurationSec: number | null;
  referenceDurationSec?: number;
  minLengthWeight?: number;
  maxLengthWeight?: number;
}): ScoreBundle['lengthAdjustment'] {
  const referenceDurationSec = args.referenceDurationSec ?? 600;
  const minLengthWeight = args.minLengthWeight ?? 0.5;
  const maxLengthWeight = args.maxLengthWeight ?? 2.0;

  if (args.performanceRatio == null || args.contributionRatio == null) {
    return {
      baseScore: null,
      durationSec: args.videoDurationSec,
      referenceDurationSec,
      weight: 1,
      adjustedScore: null,
    };
  }

  const baseScore = Math.sqrt(args.performanceRatio * args.contributionRatio);
  const weight =
    args.videoDurationSec == null || args.videoDurationSec <= 0
      ? 1
      : clamp(
          Math.log(1 + referenceDurationSec) / Math.log(1 + args.videoDurationSec),
          minLengthWeight,
          maxLengthWeight,
        );

  return {
    baseScore,
    durationSec: args.videoDurationSec,
    referenceDurationSec,
    weight,
    adjustedScore: baseScore * weight,
  };
}

export const YOUTUBE_SCORE_POLICY_V1 = 'youtube_score_v1' as const;
export const YOUTUBE_SCORE_POLICY_V2 = 'youtube_score_v2' as const;
export type YouTubeScorePolicyVersion =
  | typeof YOUTUBE_SCORE_POLICY_V1
  | typeof YOUTUBE_SCORE_POLICY_V2;

export type VideoScoreV2 = ScoreBundle & {
  policyVersion: typeof YOUTUBE_SCORE_POLICY_V2;
  absoluteViews: {
    viewCount: number | null;
    grade: ScoreGrade;
    multiplier: number;
  };
  recency: {
    daysSincePublish: number | null;
    score: number | null;
    label: string | null;
  };
  rankScore: number | null;
};

export function gradeAbsoluteViews(
  viewCount: number | null,
  options?: { isShort?: boolean | null },
): { grade: ScoreGrade; multiplier: number } {
  if (viewCount == null || !Number.isFinite(viewCount)) {
    return { grade: 'Unknown', multiplier: 1 };
  }

  const scale = options?.isShort === true ? 0.2 : 1;
  const v = viewCount;

  if (v < 10_000 * scale) return { grade: 'Worst', multiplier: 0.7 };
  if (v < 50_000 * scale) return { grade: 'Bad', multiplier: 0.85 };
  if (v < 200_000 * scale) return { grade: 'Normal', multiplier: 1 };
  if (v < 1_000_000 * scale) return { grade: 'Good', multiplier: 1 };
  return { grade: 'Great', multiplier: 1 };
}

export function recencyScoreFromPublishedAt(
  publishedAt: Date | string | null | undefined,
  now: Date = new Date(),
): { daysSincePublish: number | null; score: number | null; label: string | null } {
  if (!publishedAt) {
    return { daysSincePublish: null, score: null, label: null };
  }
  const published =
    publishedAt instanceof Date ? publishedAt : new Date(publishedAt);
  if (Number.isNaN(published.getTime())) {
    return { daysSincePublish: null, score: null, label: null };
  }
  const daysSincePublish = Math.max(
    0,
    (now.getTime() - published.getTime()) / (24 * 60 * 60 * 1000),
  );
  const score = Math.exp(-daysSincePublish / 14);
  const label =
    daysSincePublish <= 7
      ? '최근 1주'
      : daysSincePublish <= 30
        ? '최근 1개월'
        : '이전';
  return { daysSincePublish, score, label };
}

export function computeRankScore(bundle: {
  lengthAdjustment: ScoreBundle['lengthAdjustment'];
  recencyScore: number | null;
  absoluteViewMultiplier: number;
}): number | null {
  const base = bundle.lengthAdjustment.adjustedScore;
  if (base == null || !Number.isFinite(base)) return null;
  const recencyFactor =
    bundle.recencyScore == null ? 1 : 0.7 + 0.3 * bundle.recencyScore;
  return base * recencyFactor * bundle.absoluteViewMultiplier;
}

export function scoreVideoV2(args: {
  viewCount: number | null;
  subscriberCount: number | null;
  averageViewCount: number | null;
  durationSec: number | null;
  publishedAt?: Date | string | null;
  isShort?: boolean | null;
  now?: Date;
}): VideoScoreV2 {
  const base = scoreVideo({
    viewCount: args.viewCount,
    subscriberCount: args.subscriberCount,
    averageViewCount: args.averageViewCount,
    durationSec: args.durationSec,
  });
  const absoluteViews = gradeAbsoluteViews(args.viewCount, {
    isShort: args.isShort,
  });
  const recency = recencyScoreFromPublishedAt(args.publishedAt, args.now);
  const rankScore = computeRankScore({
    lengthAdjustment: base.lengthAdjustment,
    recencyScore: recency.score,
    absoluteViewMultiplier: absoluteViews.multiplier,
  });

  return {
    ...base,
    policyVersion: YOUTUBE_SCORE_POLICY_V2,
    absoluteViews: {
      viewCount: args.viewCount,
      grade: absoluteViews.grade,
      multiplier: absoluteViews.multiplier,
    },
    recency,
    rankScore,
  };
}

export function buildHotCandidateExplanation(input: {
  keyword: string;
  keywordRank: number;
  performanceGrade: ScoreGrade;
  contributionGrade: ScoreGrade;
  viewCount: number | null;
}): string {
  const views =
    input.viewCount != null
      ? new Intl.NumberFormat('ko-KR').format(input.viewCount)
      : '—';
  return `${input.keyword} 검색 풀 #${input.keywordRank}위 · 성과 ${input.performanceGrade} / 기여 ${input.contributionGrade} · 조회수 ${views}`;
}

export function emptyGradeDistribution(): Record<ScoreGrade, number> {
  return {
    Unknown: 0,
    Worst: 0,
    Bad: 0,
    Normal: 0,
    Good: 0,
    Great: 0,
  };
}

export function incrementGradeDistribution(
  dist: Record<ScoreGrade, number>,
  grade: ScoreGrade,
): void {
  dist[grade] = (dist[grade] ?? 0) + 1;
}

export function scoreVideo(args: {
  viewCount: number | null;
  subscriberCount: number | null;
  averageViewCount: number | null;
  durationSec: number | null;
}): ScoreBundle {
  const performanceRatio =
    args.viewCount != null &&
    args.subscriberCount != null &&
    args.subscriberCount > 0
      ? args.viewCount / args.subscriberCount
      : null;
  const contributionRatio =
    args.viewCount != null &&
    args.averageViewCount != null &&
    args.averageViewCount > 0
      ? args.viewCount / args.averageViewCount
      : null;
  const performanceGrade = gradeRatio(performanceRatio);
  const contributionGrade = gradeRatio(contributionRatio);

  return {
    performance: {
      ratio: performanceRatio,
      grade: performanceGrade,
    },
    contribution: {
      ratio: contributionRatio,
      grade: contributionGrade,
    },
    lengthAdjustment: lengthAdjustedScore({
      performanceRatio,
      contributionRatio,
      videoDurationSec: args.durationSec,
    }),
    highPerforming:
      isGoodOrGreat(performanceGrade) && isGoodOrGreat(contributionGrade),
  };
}
