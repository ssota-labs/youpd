import {
  buildHotCandidateExplanation,
  emptyGradeDistribution,
  incrementGradeDistribution,
  isGoodOrGreat,
  scoreVideoV2,
  YOUTUBE_SCORE_POLICY_V2,
  type ScoreGrade,
  type VideoScoreV2,
} from '../../query/scoring';
import type { KeywordProbeMetrics, KeywordHotCandidate } from '@youpd/types';

const PROBE_METRICS_MAX_ROWS = 2000;

type HarvestResultRow = {
  result: {
    harvestId: string | null;
    keyword: string;
    rank: number;
    regionCode: string | null;
    collectedAt: Date | null;
    videoId: string;
  };
  video: {
    videoId: string;
    title: string | null;
    viewCount: number | null;
    publishedAt: Date | null;
    durationSec: number | null;
    isShort: boolean | null;
  };
  channel: {
    title: string | null;
    subscriberCount: number | null;
    averageViewCount: number | null;
  } | null;
  promoted?: boolean;
};

export type ScoredHarvestRow = {
  row: HarvestResultRow;
  score: VideoScoreV2;
};

export function scoreHarvestRows(
  rows: HarvestResultRow[],
  now: Date = new Date(),
): ScoredHarvestRow[] {
  return rows.map((row) => ({
    row,
    score: scoreVideoV2({
      viewCount: row.video.viewCount,
      subscriberCount: row.channel?.subscriberCount ?? null,
      averageViewCount: row.channel?.averageViewCount ?? null,
      durationSec: row.video.durationSec,
      publishedAt: row.video.publishedAt,
      isShort: row.video.isShort,
      now,
    }),
  }));
}

/** Dedupe by video_id — keep row with highest rankScore. */
export function dedupeScoredRowsByVideo(
  scored: ScoredHarvestRow[],
): ScoredHarvestRow[] {
  const byVideo = new Map<string, ScoredHarvestRow>();
  for (const entry of scored) {
    const videoId = entry.row.video.videoId;
    const existing = byVideo.get(videoId);
    if (!existing) {
      byVideo.set(videoId, entry);
      continue;
    }
    const left = existing.score.rankScore ?? -1;
    const right = entry.score.rankScore ?? -1;
    if (right > left) {
      byVideo.set(videoId, entry);
    }
  }
  return [...byVideo.values()];
}

export function aggregateProbeMetricsFromScored(input: {
  harvestId: string;
  probeId: string;
  keywords: string[];
  regionCode: string;
  collectedAt: Date;
  scored: ScoredHarvestRow[];
  truncated?: boolean;
}): KeywordProbeMetrics {
  const deduped = dedupeScoredRowsByVideo(input.scored);
  const performanceGradeDistribution = emptyGradeDistribution();
  const contributionGradeDistribution = emptyGradeDistribution();
  const absoluteViewGradeDistribution = emptyGradeDistribution();

  let totalViews = 0;
  let goodPlusCount = 0;
  let scoredCount = 0;

  for (const { score } of deduped) {
    const views = score.absoluteViews.viewCount;
    if (views != null && Number.isFinite(views)) {
      totalViews += views;
    }
    if (
      score.performance.ratio != null &&
      score.contribution.ratio != null
    ) {
      scoredCount += 1;
    }
    if (score.highPerforming) {
      goodPlusCount += 1;
    }
    incrementGradeDistribution(
      performanceGradeDistribution,
      score.performance.grade,
    );
    incrementGradeDistribution(
      contributionGradeDistribution,
      score.contribution.grade,
    );
    incrementGradeDistribution(
      absoluteViewGradeDistribution,
      score.absoluteViews.grade,
    );
  }

  const candidateCount = deduped.length;
  const averageViews = candidateCount > 0 ? totalViews / candidateCount : 0;
  const goodPlusRatio =
    candidateCount > 0 ? goodPlusCount / candidateCount : 0;

  const sortedViews = deduped
    .map((d) => d.score.absoluteViews.viewCount)
    .filter((v): v is number => v != null && Number.isFinite(v))
    .sort((a, b) => a - b);
  const medianViews =
    sortedViews.length > 0
      ? sortedViews.length % 2 === 1
        ? sortedViews[(sortedViews.length - 1) / 2]!
        : (sortedViews[sortedViews.length / 2 - 1]! +
            sortedViews[sortedViews.length / 2]!) /
          2
      : undefined;

  return {
    probeId: input.probeId,
    harvestId: input.harvestId,
    keywords: input.keywords,
    regionCode: input.regionCode,
    collectedAt: input.collectedAt.toISOString(),
    candidateCount,
    scoredCount,
    totalViews,
    averageViews,
    medianViews,
    goodPlusCount,
    goodPlusRatio,
    performanceGradeDistribution,
    contributionGradeDistribution,
    absoluteViewGradeDistribution,
    policyVersion: YOUTUBE_SCORE_POLICY_V2,
  };
}

export function toKeywordHotCandidate(
  entry: ScoredHarvestRow,
  harvestId: string,
): KeywordHotCandidate {
  const { row, score } = entry;
  const poolSource: KeywordHotCandidate['poolSource'] = row.promoted
    ? 'keyword_promoted'
    : 'keyword';

  return {
    videoId: row.video.videoId,
    title: row.video.title ?? row.video.videoId,
    channelTitle: row.channel?.title ?? 'Unknown channel',
    publishedAt: row.video.publishedAt?.toISOString(),
    viewCount: row.video.viewCount ?? undefined,
    isShort: row.video.isShort,
    score,
    lineage: {
      probeId: harvestId,
      harvestId,
      keyword: row.result.keyword,
      keywordRank: row.result.rank,
      policyVersion: YOUTUBE_SCORE_POLICY_V2,
    },
    explanation: {
      summary: buildHotCandidateExplanation({
        keyword: row.result.keyword,
        keywordRank: row.result.rank,
        performanceGrade: score.performance.grade,
        contributionGrade: score.contribution.grade,
        viewCount: row.video.viewCount,
      }),
      performanceGrade: score.performance.grade,
      contributionGrade: score.contribution.grade,
      absoluteViewGrade: score.absoluteViews.grade,
      recencyLabel: score.recency.label ?? undefined,
    },
    poolSource,
  };
}

export function filterGoodPlusCandidates(
  scored: ScoredHarvestRow[],
): ScoredHarvestRow[] {
  return scored.filter((entry) => entry.score.highPerforming);
}

export function sortScoredByRankScore(
  scored: ScoredHarvestRow[],
  order: 'asc' | 'desc' = 'desc',
): ScoredHarvestRow[] {
  return [...scored].sort((a, b) => {
    const left = a.score.rankScore ?? -1;
    const right = b.score.rankScore ?? -1;
    return order === 'desc' ? right - left : left - right;
  });
}

export function matchesGradeFilter(
  grade: ScoreGrade,
  allowed: ScoreGrade[] | undefined,
): boolean {
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes(grade);
}

export { PROBE_METRICS_MAX_ROWS };
