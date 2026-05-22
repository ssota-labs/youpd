import type { AnalysisPolicyPort } from '../ports/policy';

export function createDefaultAnalysisPolicyPort(): AnalysisPolicyPort {
  return {
    maxChannelVideos() {
      return 500;
    },
    topPerformingVideoLimit() {
      return 10;
    },
    keywordAnalysisLimit() {
      return 50;
    },
    trendingAutoAnalyzeLimit() {
      return 10;
    },
    defaultCommentsTopN() {
      return 50;
    },
    snapshotSource() {
      return 'youpd_workflow';
    },
  };
}
