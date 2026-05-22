import { scoreVideo } from '../../query/scoring';
import type { ChannelCore, ScoredVideoCore, VideoCore } from '../core/models';

export function scoreVideoCore(
  video: VideoCore,
  channel: ChannelCore | null,
): ScoredVideoCore['score'] {
  const bundle = scoreVideo({
    viewCount: video.metrics.views,
    subscriberCount: channel?.subscriberCount ?? null,
    averageViewCount: channel?.averageViewCount ?? null,
    durationSec: video.durationSec,
  });
  return {
    ...bundle,
    adjustedScore: bundle.lengthAdjustment.adjustedScore,
  };
}

export function withScore(
  video: VideoCore,
  channel: ChannelCore | null,
): ScoredVideoCore {
  return {
    ...video,
    score: scoreVideoCore(video, channel),
  };
}

export function sortByAdjustedScore(videos: ScoredVideoCore[]): ScoredVideoCore[] {
  return [...videos].sort((a, b) => {
    const left = a.score.adjustedScore ?? -1;
    const right = b.score.adjustedScore ?? -1;
    return right - left;
  });
}
