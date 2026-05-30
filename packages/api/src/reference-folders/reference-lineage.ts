import type { ConsumerStage, KeywordHotCandidate, ReferenceVideoLineage } from '@youpd/types';

export function referenceLineageFromHotCandidate(
  candidate: KeywordHotCandidate,
  options?: {
    userProbeId?: string;
    consumerStage?: ConsumerStage;
  },
): ReferenceVideoLineage {
  return {
    sourceHarvestId: candidate.lineage.harvestId,
    sourceUserProbeId: options?.userProbeId,
    sourceKeyword: candidate.lineage.keyword,
    keywordRank: candidate.lineage.keywordRank,
    policyVersion: 'youtube_score_v2',
    performanceGrade: candidate.score.performance.grade,
    contributionGrade: candidate.score.contribution.grade,
    absoluteViewGrade: candidate.score.absoluteViews.grade,
    rankScore: candidate.score.rankScore,
    recommendationReason: candidate.explanation.summary,
    poolSource: candidate.poolSource,
    consumerStageAtSave: options?.consumerStage,
    viewCountAtSave: candidate.viewCount,
  };
}
