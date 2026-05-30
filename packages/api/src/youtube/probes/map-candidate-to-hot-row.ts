import type { KeywordHotCandidate } from '@youpd/types';
import type { HotVideoRow } from '../ports/repository';

export function keywordHotCandidateToHotVideoRow(
  candidate: KeywordHotCandidate,
  hotDate: string,
): HotVideoRow {
  return {
    hotDate,
    rank: candidate.lineage.keywordRank,
    categoryId: null,
    regionCode: 'KR',
    source:
      candidate.poolSource === 'keyword_promoted'
        ? 'keyword_promoted'
        : 'keyword',
    video: {
      id: candidate.videoId,
      provider: 'youtube',
      title: candidate.title,
      channelId: '',
      channelTitle: candidate.channelTitle,
      publishedAt: candidate.publishedAt ?? null,
      durationSec: null,
      isShort: candidate.isShort,
      metrics: {
        views: candidate.viewCount ?? null,
        likes: null,
        comments: null,
      },
      url: `https://www.youtube.com/watch?v=${candidate.videoId}`,
      thumbnailUrl: null,
      score: {
        ...candidate.score,
        adjustedScore: candidate.score.rankScore,
      },
    },
    channel: null,
  };
}
