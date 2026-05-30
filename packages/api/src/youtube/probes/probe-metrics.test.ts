import { describe, expect, it } from 'vitest';
import {
  aggregateProbeMetricsFromScored,
  dedupeScoredRowsByVideo,
  scoreHarvestRows,
} from './probe-metrics';

describe('probe metrics aggregation', () => {
  const baseRow = {
    result: {
      harvestId: '00000000-0000-4000-8000-000000000001',
      keyword: '테스트',
      rank: 1,
      regionCode: 'KR',
      collectedAt: new Date('2026-05-30T00:00:00Z'),
      videoId: 'vid-1',
    },
    video: {
      videoId: 'vid-1',
      title: 'Video 1',
      viewCount: 300_000,
      publishedAt: new Date('2026-05-25T00:00:00Z'),
      durationSec: 600,
      isShort: false,
    },
    channel: {
      title: 'Channel',
      subscriberCount: 10_000,
      averageViewCount: 20_000,
    },
  };

  it('dedupes duplicate video ids by rankScore', () => {
    const duplicate = {
      ...baseRow,
      result: { ...baseRow.result, rank: 2, keyword: '테스트2' },
    };
    const scored = scoreHarvestRows([baseRow, duplicate]);
    const deduped = dedupeScoredRowsByVideo(scored);
    expect(deduped).toHaveLength(1);
  });

  it('aggregates good+ ratio from scored rows', () => {
    const scored = scoreHarvestRows([baseRow]);
    const metrics = aggregateProbeMetricsFromScored({
      harvestId: '00000000-0000-4000-8000-000000000001',
      probeId: '00000000-0000-4000-8000-000000000001',
      keywords: ['테스트'],
      regionCode: 'KR',
      collectedAt: new Date('2026-05-30T00:00:00Z'),
      scored,
    });
    expect(metrics.policyVersion).toBe('youtube_score_v2');
    expect(metrics.candidateCount).toBe(1);
    expect(metrics.goodPlusRatio).toBeGreaterThanOrEqual(0);
    expect(metrics.totalViews).toBe(300_000);
  });
});
