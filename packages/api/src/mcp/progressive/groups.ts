import type { GroupDoc, SkillGroupCode } from './types';

export const GROUP_DOCS: Record<SkillGroupCode, GroupDoc> = {
  SYS: {
    code: 'SYS',
    name: '시스템·세팅',
    description:
      '번들 버전 확인과 노션 운영 페이지·11개 DB 스키마 조회. 운영 페이지 초기화나 스키마 동기화 스킬의 진입점.',
    when_to_use:
      '운영 페이지 셋업/점검, 노션 DB 스키마 동기화, 번들 버전·changelog 조회가 필요할 때.',
    example_intents: [
      '운영 페이지 초기 셋업해줘',
      '노션 DB 스키마 최신 버전 알려줘',
      '지금 깔린 유피디 번들 버전이 뭐야?',
      'Agent Meta DB 스키마 가져와줘',
    ],
    status: 'available',
  },
  COLLECT: {
    code: 'COLLECT',
    name: '수집·탐색',
    description:
      '키워드/영상/채널/트렌드/핫차트 수집 도구. YouTube Data API를 호출해 후보 데이터를 모으는 단계. v0.5부터 대량 적재 경로는 Notion Worker 도구(REST + 템플릿 DB 쓰기)와 REST가 기본이다.',
    when_to_use:
      '키워드 시드에서 영상·채널을 수집하거나, 특정 지역의 인기 차트·최근 N시간 급상승 영상을 가져올 때.',
    example_intents: [
      '시니어 케어 키워드로 영상 30개 수집해줘',
      '한국 인기 차트 가져와줘',
      '최근 24시간 급상승 키워드 영상 알려줘',
      '이 키워드 트렌딩 어때?',
    ],
    status: 'available',
    notes:
      'v0.5: MCP `search_keyword`·`fetch_*` 등 대량 JSON을 에이전트에 태우지 말 것. 같은 연산은 `POST /api/youpd/rest/search/keyword`(Bearer) 또는 Notion Worker `videosByKeyword` 도구(REST → Videos DB upsert)를 사용.',
  },
  METRIC: {
    code: 'METRIC',
    name: '지표·진단',
    description:
      '영상·채널 상세 메타데이터, 스냅샷 캡처, 기여도/성과도/노출확률 계산. 수집된 데이터를 평가하는 단계. v0.5에서 채널 전체·스냅샷 일괄 처리는 Worker `channelAllVideos`/`snapshotTrackedVideos`와 REST 경로 우선.',
    when_to_use:
      '단일 영상/채널 진단, 일일 스냅샷 기록, 채널 평균 대비 기여도·구독자 대비 성과도·노출확률 계산이 필요할 때.',
    example_intents: [
      '이 채널 진단해줘',
      '이 영상 상세 정보와 댓글 가져와줘',
      '오늘 영상 스냅샷 찍어줘',
      '이 영상 기여도·성과도 계산해줘',
      '채널의 모든 영상 수집해서 분석해줘',
    ],
    status: 'available',
    notes:
      'v0.5: `get_channel_all_videos`·`snapshot_now` 대량 호출은 REST `/api/youpd/rest/channels/...` 또는 Worker `channelAllVideos`/`snapshotTrackedVideos`(스케줄러용) 우선.',
  },
  COMMENT: {
    code: 'COMMENT',
    name: '댓글 인사이트',
    description:
      '영상 댓글에서 후킹·카피·시청자 페인포인트를 뽑기 위한 도구. v0.5에서 대량 TOP-N 수집은 Worker `videoComments` 도구 또는 REST 우선.',
    when_to_use:
      '댓글에서 인기 반응·후킹 문구·시청자 페르소나 단서를 찾고 싶을 때.',
    example_intents: [
      '이 영상 댓글에서 후킹 뽑아줘',
      '시청자 반응 좋은 댓글 보여줘',
      '이 영상 댓글 인사이트 정리해줘',
      '댓글 기반 카피 후보 찾아줘',
    ],
    status: 'available',
    notes:
      'v0.5: MCP `get_video_comments`는 폴백. 가능하면 Worker `videoComments` 또는 REST 후 노션 DB 뷰에서 확인.',
  },
  PLAN: {
    code: 'PLAN',
    name: '기획·후보 작성',
    description:
      '키 콘텐츠 후보·풀 콘텐츠 후보 노션 페이지 properties payload 생성. 노션 createPage 직전 단계.',
    when_to_use:
      '수집·진단·댓글 인사이트를 바탕으로 노션의 Key/Pull Content Candidates DB에 후보 행을 만들 때.',
    example_intents: [
      '이 영상 기반으로 키 콘텐츠 후보 만들어줘',
      '풀 콘텐츠 후보 노션에 올려줘',
      '기획안 후보 페이로드 만들어줘',
    ],
    status: 'available',
  },
  REPORT: {
    code: 'REPORT',
    name: '자동 리포트 (트리거 전용)',
    description:
      '주간·월간 자동 리포트. 노션 자동화 트리거나 스케줄러에서만 실행됨. 채팅에서 호출 금지.',
    when_to_use:
      '리포트는 노션 자동화/스케줄러가 실행한다. 채팅 컨텍스트에서는 호출하지 말 것.',
    example_intents: [
      '(채팅 호출 금지 — 노션 자동화 트리거에서만 실행)',
    ],
    status: 'trigger_only',
    notes:
      'REPORT 그룹의 도구는 채팅에서 호출하지 마세요. 노션 자동화 트리거 컨텍스트에서만 실행됩니다.',
  },
  THUMB: {
    code: 'THUMB',
    name: '썸네일 디자이너',
    description:
      '8 패턴 템플릿 + Konva 캔버스 + Realtime 동기화 기반 썸네일 시안 생성·편집·export. Notion 후보 row 첨부까지 한 흐름.',
    when_to_use:
      '풀/키 후보 row에서 썸네일 시안을 만들거나, 기존 시안의 레이어를 자연어로 수정하거나, 16:9/9:16 PNG export가 필요할 때.',
    example_intents: [
      '이 후보에 쇼크 빨간 숫자 패턴으로 시안 만들어줘',
      '시안 A의 헤드라인 더 짧게 바꿔줘',
      '댓글 기반 썸네일 카피 5개 제안해줘',
      '시안 PNG 내려서 노션에 첨부해줘',
    ],
    status: 'available',
  },
};

export const ALL_GROUP_CODES: readonly SkillGroupCode[] = [
  'SYS',
  'COLLECT',
  'METRIC',
  'COMMENT',
  'PLAN',
  'REPORT',
  'THUMB',
];
