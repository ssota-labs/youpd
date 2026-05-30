import { describe, expect, it } from 'vitest';
import { HomeFeedResponseSchema } from './home-feed';

describe('HomeFeedResponseSchema', () => {
  it('parses fixture-shaped payload', () => {
    const parsed = HomeFeedResponseSchema.parse({
      onboarding: {
        interestTopics: '엑셀 자동화, 노션 운영',
        channelDescription: '직장인 생산성 채널',
      },
      probes: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          probeLabel: '직장인 엑셀 자동화 레퍼런스',
          audience: '30대 직장인',
          seedTheme: '엑셀 반복 업무',
          problemOrSituation: '매주 동일한 보고서 정리',
          goal: '시간 절약 사례 수집',
          consumerStage: 'problem_aware',
          rationale: '최근 관심 주제와 채널 설명이 일치합니다.',
          searchStatus: 'ready',
          suggestedKeywords: ['엑셀 자동화', '보고서 자동화'],
        },
      ],
      candidates: [
        {
          id: '00000000-0000-4000-8000-000000000010',
          probeId: '00000000-0000-4000-8000-000000000001',
          videoId: 'dQw4w9WgXcQ',
          title: '엑셀 보고서 10분 컷',
          channelTitle: 'Productivity Lab',
          recommendationReason: '동일 고객군의 문제 인식형 오프닝',
        },
      ],
      systemStatus: { youtubeKeys: 'not_configured' },
      source: 'fixture',
    });

    expect(parsed.probes).toHaveLength(1);
    expect(parsed.source).toBe('fixture');
  });
});
