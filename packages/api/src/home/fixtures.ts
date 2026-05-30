import type { HomeFeedResponse } from '@youpd/types';

const PROBE_1 = '00000000-0000-4000-8000-000000000001';
const PROBE_2 = '00000000-0000-4000-8000-000000000002';

/** Seeded probes + candidates for S1 when automation is not configured. */
export function buildFixtureHomeFeed(
  onboarding: HomeFeedResponse['onboarding'],
): HomeFeedResponse {
  const probes = [
    {
      id: PROBE_1,
      probeLabel: '직장인 엑셀·반복 업무 레퍼런스 풀',
      audience: '30대 사무직 · 생산성 채널 시청자',
      seedTheme: '엑셀 반복 업무 자동화',
      problemOrSituation: '매주 동일한 보고서·피벗 정리에 시간 소모',
      goal: '문제 인식형 오프닝과 실전 자동화 사례 수집',
      consumerStage: 'problem_aware' as const,
      rationale:
        '입력하신 관심 주제와 채널 설명에서 “반복 업무·엑셀” 신호가 강합니다. SEO 검색량이 아니라 레퍼런스 풀 탐색용 프로브입니다.',
      searchStatus: 'ready' as const,
      suggestedKeywords: ['엑셀 자동화', '보고서 자동화', '피벗테이블 매크로'],
      status: 'draft' as const,
    },
    {
      id: PROBE_2,
      probeLabel: '노션·업무 시스템 구축 레퍼런스',
      audience: '1인 크리에이터 · 운영자',
      seedTheme: '노션 운영 템플릿',
      problemOrSituation: '콘텐츠·업무 정보가 흩어져 기획 속도 저하',
      goal: '시스템 소개형·전후 비교형 레퍼런스 확보',
      consumerStage: 'solution_aware' as const,
      rationale:
        '채널 설명의 “기획·운영” 키워드와 맞는 솔루션 인지 단계 프로브입니다.',
      searchStatus: 'not_run' as const,
      suggestedKeywords: ['노션 업무 시스템', '노션 템플릿', '콘텐츠 기획 노션'],
      status: 'draft' as const,
    },
  ];

  const candidates = [
    {
      id: '00000000-0000-4000-8000-000000000010',
      probeId: PROBE_1,
      videoId: 'fixture-excel-01',
      title: '주간 보고서 10분 컷 — 엑셀 자동화 실전',
      channelTitle: 'Productivity Lab KR',
      viewCount: 284_000,
      recommendationReason:
        '동일 고객군·문제 상황에서 강한 오프닝 후 단계별 데모로 설득합니다.',
      performanceHint: 'Good+',
    },
    {
      id: '00000000-0000-4000-8000-000000000011',
      probeId: PROBE_1,
      videoId: 'fixture-excel-02',
      title: '피벗 없이 끝내는 반복 보고 — 파워쿼리 입문',
      channelTitle: '데이터 업무 연구소',
      viewCount: 91_200,
      recommendationReason:
        '“매주 반복” Pain을 첫 30초에 명시해 프로브 의도와 맞습니다.',
      performanceHint: 'Good',
    },
    {
      id: '00000000-0000-4000-8000-000000000012',
      probeId: PROBE_2,
      videoId: 'fixture-notion-01',
      title: '1인 기업 노션 대시보드 — 기획·촬영·업로드 한 화면',
      channelTitle: 'Solo Creator Ops',
      viewCount: 156_000,
      recommendationReason:
        '채널 운영 맥락과 맞는 시스템형 레퍼런스 후보입니다.',
    },
  ];

  return {
    onboarding,
    probes,
    candidates,
    systemStatus: {
      youtubeKeys: 'not_configured',
      quotaLabel: 'S1 fixture mode',
    },
    source: 'fixture',
  };
}
