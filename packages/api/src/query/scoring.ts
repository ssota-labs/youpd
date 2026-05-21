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
