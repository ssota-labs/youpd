export interface AnalysisPolicyPort {
  maxChannelVideos(): number;
  topPerformingVideoLimit(): number;
  keywordAnalysisLimit(): number;
  trendingAutoAnalyzeLimit(): number;
  defaultCommentsTopN(): number;
  snapshotSource(): string;
}
