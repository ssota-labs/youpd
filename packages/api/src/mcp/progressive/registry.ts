import type { SkillGroupCode, ToolDoc } from './types';

export const TOOL_DOCS: readonly ToolDoc[] = [
  {
    name: 'get_latest_version',
    group_code: 'SYS',
    short_description:
      '번들·스키마 버전 문자열을 반환한다. 0 quota. 먼저 `get_skill_group("SYS")`로 사용법 확인 권장.',
    long_description:
      '현재 MCP 서버가 퍼블리시하는 번들 + 노션 DB 스키마 버전을 한 번에 반환한다. 사용자가 노션에 셋업한 번들이 최신인지 비교할 때 사용.',
    when_to_use:
      '버전 비교·changelog 확인 진입점. 운영 페이지 셋업 직후 / 스키마 동기화 스킬 시작 시.',
    example_calls: ['get_latest_version()'],
    quota_cost: '0',
    tags: ['version', 'sys'],
  },
  {
    name: 'get_latest_version_schema',
    group_code: 'SYS',
    short_description:
      '11개 노션 DB 스키마(or 단일 db_name) 반환. 0 quota. 먼저 `get_skill_group("SYS")` 권장.',
    long_description:
      'Notion createDatabase 모양의 스키마를 11개 DB 전체 또는 단일 DB(`db_name`)로 반환한다. 신규 운영 페이지에 DB를 새로 만들거나, 기존 DB와 비교해 누락 속성을 찾는 동기화 스킬의 입력.',
    when_to_use:
      '운영 페이지 초기 셋업, 스키마 동기화(repair_schema/sync_schema 스킬)의 기준 스키마가 필요할 때.',
    example_calls: [
      'get_latest_version_schema()',
      'get_latest_version_schema({ db_name: "videos" })',
      'get_latest_version_schema({ db_name: "agent_meta" })',
    ],
    quota_cost: '0',
    tags: ['schema', 'notion', 'sys'],
  },
  {
    name: 'search_keyword',
    group_code: 'COLLECT',
    short_description:
      'YouTube 키워드 검색 + 영상·채널 enrichment. ~102 quota. 먼저 `get_skill_group("COLLECT")` 권장.',
    long_description:
      'search.list → videos.list → channels.list을 한 번에 호출해 키워드에 대한 영상·채널 요약을 정규화해 반환한다. 시드 키워드에서 후보 영상·채널을 발견하는 진입 도구.',
    when_to_use:
      '신규 키워드 시드에서 후보 영상·채널을 처음 모을 때.',
    example_calls: [
      'search_keyword({ keyword: "시니어 케어", max_results: 30 })',
    ],
    quota_cost: '~102',
    tags: ['collect', 'keyword', 'search'],
  },
  {
    name: 'fetch_hot_chart',
    group_code: 'COLLECT',
    short_description:
      '지역/카테고리 인기 차트 영상. 1 quota. 먼저 `get_skill_group("COLLECT")` 권장.',
    long_description:
      'videos.list?chart=mostPopular 결과를 지역(기본 KR)·카테고리 옵션으로 반환한다.',
    when_to_use:
      '특정 지역의 현재 인기 영상을 일일 단위로 캡처할 때.',
    example_calls: [
      'fetch_hot_chart({ region_code: "KR" })',
      'fetch_hot_chart({ region_code: "KR", video_category_id: "22" })',
    ],
    quota_cost: '1',
    tags: ['collect', 'chart', 'trending'],
  },
  {
    name: 'fetch_trending_by_keyword',
    group_code: 'COLLECT',
    short_description:
      '최근 N시간 급상승 영상 (키워드+시간 윈도우). ~102 quota. 먼저 `get_skill_group("COLLECT")` 권장.',
    long_description:
      'search.list(publishedAfter=now-Nh, order=viewCount) → videos.list + channels.list로 빠르게 떠오르는 영상을 잡는다. 기본 24시간 윈도우.',
    when_to_use:
      '최근 N시간 안에 빠르게 뜨는 영상·키워드를 잡아야 할 때.',
    example_calls: [
      'fetch_trending_by_keyword({ keyword: "치매", hours: 24, max_results: 20 })',
    ],
    quota_cost: '~102',
    tags: ['collect', 'trending', 'keyword'],
  },
  {
    name: 'get_video_detail',
    group_code: 'METRIC',
    short_description:
      '단일 영상 상세 + 상위 50 댓글. ~3 quota. 먼저 `get_skill_group("METRIC")` 권장.',
    long_description:
      'videos.list + channels.list + commentThreads.list(TOP 50 by likeCount)을 한 번에 묶어 영상의 메타·채널 컨텍스트·반응 좋은 댓글 50개를 같이 반환한다.',
    when_to_use:
      '특정 영상을 깊게 진단할 때(시청자 반응까지 같이 보고 싶을 때).',
    example_calls: [
      'get_video_detail({ video_id: "abcd1234" })',
    ],
    quota_cost: '~3',
    tags: ['metric', 'video', 'detail'],
  },
  {
    name: 'get_channel_overview',
    group_code: 'METRIC',
    short_description:
      '채널 + 인기 top-N 영상 요약. ~3 quota. 먼저 `get_skill_group("METRIC")` 권장.',
    long_description:
      'channels.list + playlistItems.list(uploads, 50개) + videos.list을 묶어 채널 메타와 인기 상위 영상을 정렬해 반환.',
    when_to_use:
      '경쟁 채널을 빠르게 훑거나 채널 톤·인기 영상 패턴을 파악할 때.',
    example_calls: [
      'get_channel_overview({ channel_id: "UC...", top_n: 10 })',
    ],
    quota_cost: '~3',
    tags: ['metric', 'channel', 'overview'],
  },
  {
    name: 'get_channel_all_videos',
    group_code: 'METRIC',
    short_description:
      '채널 전체 영상 페이지네이션. Budget = 1 + 2 × ceil(max/50). 먼저 `get_skill_group("METRIC")` 권장.',
    long_description:
      '채널의 모든 업로드를 페이지네이션으로 끌어와 videos.list 배치로 enrich한다. 깊은 경쟁 분석용. quota 예산이 큼.',
    when_to_use:
      '특정 채널의 전 영상 라이브러리를 분석해야 할 때(quota 예산을 충분히 잡고).',
    example_calls: [
      'get_channel_all_videos({ channel_id: "UC...", max_videos: 200 })',
    ],
    quota_cost: '1 + 2×ceil(max/50)',
    tags: ['metric', 'channel', 'bulk'],
  },
  {
    name: 'snapshot_now',
    group_code: 'METRIC',
    short_description:
      '추적 영상들의 오늘 조회수/좋아요/댓글 스냅샷. ~ceil(N/50) quota. 먼저 `get_skill_group("METRIC")` 권장.',
    long_description:
      'videos.list을 50개씩 배치 호출해 영상별 일일 스냅샷 행을 반환한다(snapshot_date는 PT 캘린더 기준). 에이전트가 Video Snapshots DB에 upsert.',
    when_to_use:
      '추적 중인 영상 N개의 일일 메트릭을 캡처해 Video Snapshots DB에 기록할 때.',
    example_calls: [
      'snapshot_now({ video_ids: ["abc","def","ghi"] })',
    ],
    quota_cost: '~ceil(N/50)',
    tags: ['metric', 'snapshot'],
  },
  {
    name: 'compute_metrics',
    group_code: 'METRIC',
    short_description:
      '기여도/성과도/노출확률 계산 (순수 함수). 0 quota. 먼저 `get_skill_group("METRIC")` 권장.',
    long_description:
      'Videos DB 공식과 동일: 기여도 = views / channel_avg_views, 성과도 = views / channel_subs, 노출확률 = (7d delta/7) / (30d delta/30). YouTube 호출 없음.',
    when_to_use:
      '스냅샷 히스토리·채널 평균이 준비된 다음 지표 3종을 계산할 때.',
    example_calls: [
      'compute_metrics({ video_id: "abc", views: 100000, channel_avg_views: 20000, channel_subs: 500000, delta_7d: 12000, delta_30d: 38000 })',
    ],
    quota_cost: '0',
    tags: ['metric', 'compute', 'formula'],
  },
  {
    name: 'get_video_comments',
    group_code: 'COMMENT',
    short_description:
      '영상의 좋아요 TOP N 댓글. 1 quota. 먼저 `get_skill_group("COMMENT")` 권장.',
    long_description:
      'commentThreads.list(order=relevance, maxResults=100)을 likeCount desc로 정렬해 상위 N개를 반환. 댓글 비활성 영상은 comments_disabled=true.',
    when_to_use:
      '영상 댓글에서 후킹·카피·시청자 페인포인트를 뽑을 때.',
    example_calls: [
      'get_video_comments({ video_id: "abc", top_n: 20 })',
    ],
    quota_cost: '1',
    tags: ['comment', 'insight', 'hook'],
  },
  {
    name: 'notion_create_key_candidate',
    group_code: 'PLAN',
    short_description:
      '키 콘텐츠 후보 노션 properties payload 생성. 0 quota. 먼저 `get_skill_group("PLAN")` 권장.',
    long_description:
      '{ properties, icon, database_ref="key_content_candidates" } 형식으로 Notion pages.create 입력을 만든다. parent.database_id는 에이전트가 Agent Meta에서 채워 넣음.',
    when_to_use:
      '수집·진단·댓글 인사이트를 바탕으로 키 콘텐츠 후보 노션 행을 만들 때.',
    example_calls: [
      'notion_create_key_candidate({ title: "...", source_video_id: "abc", reasoning: "..." })',
    ],
    quota_cost: '0',
    tags: ['plan', 'notion', 'candidate'],
  },
  {
    name: 'notion_create_pull_candidate',
    group_code: 'PLAN',
    short_description:
      '풀 콘텐츠 후보 노션 properties payload 생성. 0 quota. 먼저 `get_skill_group("PLAN")` 권장.',
    long_description:
      '{ properties, icon, database_ref="pull_content_candidates" } 형식으로 Notion pages.create 입력을 만든다. parent.database_id는 에이전트가 채움.',
    when_to_use:
      '풀 콘텐츠(시리즈물·롱폼) 후보 노션 행을 만들 때.',
    example_calls: [
      'notion_create_pull_candidate({ title: "...", reasoning: "..." })',
    ],
    quota_cost: '0',
    tags: ['plan', 'notion', 'candidate', 'pull'],
  },
  {
    name: 'search_sessions_summary',
    group_code: 'SYS',
    short_description:
      'MCP search_sessions 감사 로그 집계 (server-wide). 0 quota. 먼저 `get_skill_group("SYS")` 권장.',
    long_description:
      'MCP 서버의 search_sessions audit 로그를 PT 캘린더 day 단위로 집계해 운영자 대시보드 입력으로 반환한다. group_by: operation | status | day | operation+status. server-wide (per-user 필터 없음).',
    when_to_use:
      '오퍼레이터가 일별·작업별·상태별 호출 추이를 점검하거나 quota 사용 패턴을 분석할 때.',
    example_calls: [
      'search_sessions_summary({ days: 7, group_by: "operation" })',
      'search_sessions_summary({ days: 30, group_by: "operation+status" })',
    ],
    quota_cost: '0',
    tags: ['sys', 'audit', 'session', 'admin'],
  },
  {
    name: 'thumbnail_create',
    group_code: 'THUMB',
    short_description:
      '신규 썸네일 시안 생성 (템플릿 또는 document 직접). 0 quota. 먼저 `get_skill_group("THUMB")` 권장.',
    long_description:
      '템플릿 코드 + fillers 또는 명시적 document로 thumbnails row를 만든다. embedUrl을 반환해 노션 본문에 iframe 으로 삽입할 수 있다.',
    when_to_use:
      '후보 row에 새 시안을 생성할 때 (템플릿 우선; 자유 편집은 document 직접 입력).',
    example_calls: [
      'thumbnail_create({ orgId, notionCandidateUrl, templateCode: "shock-red-number-16x9", fillers: { headline: "무릎통증 90%", accent: "90%", number: "3" } })',
    ],
    quota_cost: '0',
    tags: ['thumb', 'create'],
  },
  {
    name: 'thumbnail_list',
    group_code: 'THUMB',
    short_description:
      '한 후보의 모든 시안 목록. 0 quota. 먼저 `get_skill_group("THUMB")` 권장.',
    long_description:
      'notionCandidateUrl 기준으로 thumbnails row 를 updatedAt desc 순으로 반환.',
    when_to_use: '후보 row의 시안 갯수·최신 상태 확인.',
    example_calls: [
      'thumbnail_list({ orgId, notionCandidateUrl })',
    ],
    quota_cost: '0',
    tags: ['thumb', 'list'],
  },
  {
    name: 'thumbnail_set_layer',
    group_code: 'THUMB',
    short_description:
      '시안 한 레이어를 부분 수정 (optimistic version lock). 0 quota.',
    long_description:
      'layerId 기준 partial patch를 적용. version mismatch 시 VERSION_CONFLICT, 잘못된 patch는 INVALID_LAYER_PATCH. Realtime broadcast 동봉.',
    when_to_use: '에이전트가 자연어로 카피·색·위치를 바꿀 때.',
    example_calls: [
      'thumbnail_set_layer({ thumbnailId, layerId: "headline", patch: { text: "이 운동, 무릎에 독입니다", fontSize: 72 } })',
    ],
    quota_cost: '0',
    tags: ['thumb', 'edit'],
  },
  {
    name: 'thumbnail_add_layer',
    group_code: 'THUMB',
    short_description: '시안에 새 레이어 추가. 0 quota.',
    long_description:
      'text/image/shape 레이어를 layers 배열 끝에 추가. id 중복은 INVALID_LAYER_PATCH.',
    when_to_use: '서브카피·강조 박스·이미지 오버레이를 더할 때.',
    example_calls: [
      'thumbnail_add_layer({ thumbnailId, layer: { type: "text", id: "subcopy", text: "전문의가 알려주는 체크포인트", x: 120, y: 580 } })',
    ],
    quota_cost: '0',
    tags: ['thumb', 'edit'],
  },
  {
    name: 'thumbnail_apply_template',
    group_code: 'THUMB',
    short_description: '템플릿+fillers로 신규 시안 생성. 0 quota.',
    long_description:
      'thumbnail_create의 템플릿 전용 alias — fillers placeholder ({headline}, {accent}, {number}, {quote}, {face_image})를 치환해 row를 만든다.',
    when_to_use: '동일 후보에 여러 패턴 시안을 비교 생성할 때.',
    example_calls: [
      'thumbnail_apply_template({ orgId, notionCandidateUrl, templateCode: "face-quote-16x9", fillers: { headline: "걷기 운동, 이렇게 하면 역효과", quote: "댓글에서 가장 많이 묻는 질문" } })',
    ],
    quota_cost: '0',
    tags: ['thumb', 'template'],
  },
  {
    name: 'thumbnail_suggest_titles_from_comments',
    group_code: 'THUMB',
    short_description:
      '댓글 텍스트에서 썸네일 카피 후보 제안 (v0.4 MVP: deterministic stub). 0 quota.',
    long_description:
      'commentTexts 배열을 받아 headline/accent/reason 객체를 count 개 반환. LLM 어댑터는 v0.5에 본 구현 — 현재는 결정론적 stub.',
    when_to_use: '댓글 인사이트에서 카피 후보를 빠르게 뽑고 싶을 때.',
    example_calls: [
      'thumbnail_suggest_titles_from_comments({ notionCandidateUrl, commentTexts: ["..."], count: 5 })',
    ],
    quota_cost: '0',
    tags: ['thumb', 'copy', 'comment'],
  },
  {
    name: 'thumbnail_export_png',
    group_code: 'THUMB',
    short_description:
      '시안을 PNG로 렌더해 Storage에 업로드. 0 quota (server compute only).',
    long_description:
      'satori + resvg로 16:9 (옵션: 9:16) PNG를 렌더링하고 export 버킷에 업로드해 long-lived 공개 URL을 반환. 호출자는 이 URL을 Notion files 속성에 첨부.',
    when_to_use: '시안 확정 후 Notion 후보 row에 첨부할 PNG 가 필요할 때.',
    example_calls: [
      'thumbnail_export_png({ thumbnailId, formats: ["16:9"] })',
    ],
    quota_cost: '0',
    tags: ['thumb', 'export', 'png'],
  },
  {
    name: 'thumbnail_get_embed_url',
    group_code: 'THUMB',
    short_description:
      '시안의 iframe embedUrl + publicPreviewUrl. 0 quota.',
    long_description:
      'YOUPD_APP_URL 기준 디자이너 iframe URL과 공개 미리보기 URL을 반환.',
    when_to_use: '노션 본문에 iframe block을 다시 박을 때.',
    example_calls: [
      'thumbnail_get_embed_url({ thumbnailId })',
    ],
    quota_cost: '0',
    tags: ['thumb', 'embed'],
  },
  {
    name: 'thumbnail_reorder_layers',
    group_code: 'THUMB',
    short_description:
      '시안 layers의 z-order 재배열. 0 quota.',
    long_description:
      'layerIds 배열 순서대로 thumbnails.layers를 다시 정렬. 모든 기존 layer id를 정확히 1번씩 포함해야 하며, 불일치 시 INVALID_LAYER_ORDER. version 충돌은 VERSION_CONFLICT.',
    when_to_use: '레이어 패널에서 z-order를 바꾸거나 텍스트를 이미지 위로 올릴 때.',
    example_calls: [
      'thumbnail_reorder_layers({ thumbnailId, layerIds: ["bg", "number", "headline", "accent"] })',
    ],
    quota_cost: '0',
    tags: ['thumb', 'edit'],
  },
  {
    name: 'thumbnail_delete_layer',
    group_code: 'THUMB',
    short_description: '시안에서 단일 layer 제거. 0 quota.',
    long_description:
      'layerId에 해당하는 layer를 layers 배열에서 제거. 존재하지 않으면 LAYER_NOT_FOUND. version 충돌은 VERSION_CONFLICT.',
    when_to_use: '불필요한 레이어를 정리하거나 잘못 추가한 레이어를 되돌릴 때.',
    example_calls: [
      'thumbnail_delete_layer({ thumbnailId, layerId: "subcopy" })',
    ],
    quota_cost: '0',
    tags: ['thumb', 'edit'],
  },
  {
    name: 'get_bundle_manifest',
    group_code: 'SYS',
    short_description:
      '번들 매니페스트(version, template_url, healthcheck, changelog). 0 quota. 코어 도구 — 직접 호출 가능.',
    long_description:
      '번들 버전 + 노션 템플릿 페이지 URL + healthcheck URL + changelog. 에이전트 첫 대화의 진입점이자 코어 도구라 `get_skill_group` 호출 없이 바로 사용 가능.',
    when_to_use:
      '에이전트 세션 시작 시 가장 먼저 번들 상태를 확인할 때.',
    example_calls: ['get_bundle_manifest()'],
    quota_cost: '0',
    tags: ['version', 'sys', 'core'],
  },
];

export const TOOL_DOCS_BY_NAME: ReadonlyMap<string, ToolDoc> = new Map(
  TOOL_DOCS.map((doc) => [doc.name, doc]),
);

export function getToolDoc(name: string): ToolDoc | undefined {
  return TOOL_DOCS_BY_NAME.get(name);
}

export function getToolsForGroup(group: SkillGroupCode): ToolDoc[] {
  return TOOL_DOCS.filter((doc) => doc.group_code === group);
}
