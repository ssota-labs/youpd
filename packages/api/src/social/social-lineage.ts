import type {
  ConsumerStage,
  SocialPostLineage,
  SocialProvider,
  ScoreGrade,
} from '@youpd/types';

export function socialLineageFromScoredPost(input: {
  postId: string;
  provider: SocialProvider;
  permalink: string;
  metricSnapshotId: string;
  performanceGrade: ScoreGrade;
  engagementGrade: ScoreGrade;
  recencyGrade: ScoreGrade;
  rankScore: number | null;
  recommendationReason: string;
  consumerStageAtSave?: ConsumerStage;
}): SocialPostLineage {
  return {
    sourcePostId: input.postId,
    sourceProvider: input.provider,
    permalink: input.permalink,
    metricSnapshotId: input.metricSnapshotId,
    policyVersion: 'social_score_v1',
    performanceGrade: input.performanceGrade,
    engagementGrade: input.engagementGrade,
    recencyGrade: input.recencyGrade,
    rankScore: input.rankScore,
    recommendationReason: input.recommendationReason,
    consumerStageAtSave: input.consumerStageAtSave,
  };
}
