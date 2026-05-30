import { describe, expect, it } from 'vitest';
import type { KeywordHotCandidate } from '@youpd/types';
import { referenceLineageFromHotCandidate } from './reference-lineage';

const fixtureCandidate: KeywordHotCandidate = {
  videoId: 'abc123',
  title: 'Test video',
  channelTitle: 'Channel',
  viewCount: 1000,
  isShort: false,
  score: {
    performance: { ratio: 2, grade: 'Good' },
    contribution: { ratio: 1.5, grade: 'Great' },
    lengthAdjustment: {
      baseScore: 1,
      durationSec: 600,
      referenceDurationSec: 600,
      weight: 1,
      adjustedScore: 1,
    },
    highPerforming: true,
    policyVersion: 'youtube_score_v2',
    absoluteViews: { viewCount: 1000, grade: 'Good', multiplier: 1 },
    recency: { daysSincePublish: 10, score: 0.8, label: 'recent' },
    rankScore: 12.5,
  },
  lineage: {
    probeId: '00000000-0000-4000-8000-000000000001',
    harvestId: '00000000-0000-4000-8000-000000000002',
    keyword: '테스트 키워드',
    keywordRank: 3,
    policyVersion: 'youtube_score_v2',
  },
  explanation: {
    summary: 'Good performance on keyword',
    performanceGrade: 'Good',
    contributionGrade: 'Great',
    absoluteViewGrade: 'Good',
  },
  poolSource: 'keyword',
};

describe('referenceLineageFromHotCandidate', () => {
  it('maps hot candidate fields into lineage snapshot', () => {
    const lineage = referenceLineageFromHotCandidate(fixtureCandidate, {
      userProbeId: '00000000-0000-4000-8000-000000000099',
      consumerStage: 'problem_aware',
    });

    expect(lineage.sourceHarvestId).toBe(fixtureCandidate.lineage.harvestId);
    expect(lineage.sourceUserProbeId).toBe('00000000-0000-4000-8000-000000000099');
    expect(lineage.sourceKeyword).toBe('테스트 키워드');
    expect(lineage.keywordRank).toBe(3);
    expect(lineage.performanceGrade).toBe('Good');
    expect(lineage.recommendationReason).toBe('Good performance on keyword');
    expect(lineage.consumerStageAtSave).toBe('problem_aware');
  });
});
