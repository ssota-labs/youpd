/**
 * Virtual E2E for v0.3 Progressive MCP module.
 *
 * Plays the part of a Notion-AI-style agent driving the new flow:
 *   user query → read get_skill_group description → pick group → call
 *   get_skill_group({code}) → call the recommended domain tool.
 *
 * No YouTube/Notion network calls; only stateless/pure tools are invoked
 * for real. Network-bound tools (search_keyword, snapshot_now, …) are
 * shown as planned calls with the args the agent would pass.
 */
/* eslint-disable no-console */
import {
  GROUP_DOCS,
  TOOL_DOCS,
  TOOL_DOCS_BY_NAME,
  buildSkillGroupResponse,
  buildSkillGroupRoutingDescription,
} from '@youpd/api/mcp/progressive';
import type { SkillGroupCode } from '@youpd/api/mcp/progressive';
import {
  computeMetrics,
  notionCreateKeyCandidate,
} from '@youpd/api/mcp/tools';
import {
  getBundleManifest,
  getLatestVersionSchema,
} from '@youpd/api/mcp/version';

type Scenario = {
  title: string;
  userMessage: string;
  pickGroup: SkillGroupCode;
  // returns either the actual structuredContent (for pure tools) or a
  // descriptor of the network-bound call that would be made
  act: () => Promise<unknown> | unknown;
};

function rule(char = '─', width = 78): string {
  return char.repeat(width);
}

function header(title: string): void {
  console.log('\n' + rule('═'));
  console.log(`  ${title}`);
  console.log(rule('═'));
}

function step(label: string, body: string): void {
  console.log(`\n[${label}]`);
  console.log(body);
}

function preview(value: unknown, maxLines = 12): string {
  const text =
    typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  const lines = text.split('\n');
  if (lines.length <= maxLines) return text;
  return [...lines.slice(0, maxLines), `… (+${lines.length - maxLines} more)`].join(
    '\n',
  );
}

function listAllToolDescriptions(): { name: string; description: string }[] {
  // Mirrors what tools/list would expose post-trim. We intentionally
  // walk the registry rather than spinning up an McpServer.
  return [
    {
      name: 'get_skill_group',
      description: buildSkillGroupRoutingDescription(),
    },
    ...TOOL_DOCS.map((d) => ({
      name: d.name,
      description: d.short_description,
    })),
  ];
}

const SCENARIOS: Scenario[] = [
  {
    title: 'S1 — 댓글에서 후킹 뽑기',
    userMessage: '이 영상 댓글에서 후킹 좀 뽑아줘. video_id=demo-vid-1',
    pickGroup: 'COMMENT',
    act: () => ({
      planned_tool_call: {
        name: 'get_video_comments',
        args: { video_id: 'demo-vid-1', top_n: 20 },
      },
      note: 'YouTube API 호출 — 실제 키 필요. quota=1.',
    }),
  },
  {
    title: 'S2 — 채널 진단 (지표 계산)',
    userMessage:
      '이 영상 기여도/성과도/노출확률 계산해줘. 채널 평균 조회수 20000, 구독자 500000, 최근 조회수 100000, 7일·30일 스냅샷 가져옴.',
    pickGroup: 'METRIC',
    act: async () =>
      await computeMetrics({
        latest_views: 100000,
        channel_avg_views: 20000,
        channel_subs: 500000,
        snapshots: [
          { snapshot_date: '2026-05-07', views: 88000 },
          { snapshot_date: '2026-04-14', views: 62000 },
        ],
      }),
  },
  {
    title: 'S3 — 키 콘텐츠 후보 노션 페이로드',
    userMessage:
      '시니어 케어 음성 쇼핑 키 콘텐츠 후보 노션에 올릴 페이로드 만들어줘.',
    pickGroup: 'PLAN',
    act: async () =>
      await notionCreateKeyCandidate({
        title: '시니어 케어 음성 쇼핑 — 초기 후보',
        stage: '1.수집',
        production_priority: 'High',
        feature_text: '음성으로 부모님 대신 주문해주는 시청자 다수 — 음성 인터랙션 친화 콘텐츠.',
        problem_text: '시니어 사용자가 직접 주문 흐름을 따라가기 어려움.',
        sales_logic_draft: '대신 주문 → 후기 → 추천의 3단 구조로 풀어볼 만한 키 콘텐츠.',
        keyword_page_ids: [],
        reference_video_page_ids: [],
        pull_candidate_page_ids: [],
        owner_user_ids: [],
      }),
  },
  {
    title: 'S4 — 번들 매니페스트 확인',
    userMessage: '지금 깔린 유피디 번들 버전이 뭐야?',
    pickGroup: 'SYS',
    act: () => getBundleManifest(),
  },
  {
    title: 'S5 — Agent Meta DB 스키마만 보기',
    userMessage: 'Agent Meta DB 스키마 가져와줘.',
    pickGroup: 'SYS',
    act: () => getLatestVersionSchema('agent_meta'),
  },
  {
    title: 'S6 — THUMB 그룹 호출 (reserved 안내 확인)',
    userMessage: '댓글 기반 썸네일 카피 3개 만들어줘.',
    pickGroup: 'THUMB',
    act: () => ({
      note: 'get_skill_group 응답이 status=reserved + tools=[]를 반환했으므로 에이전트는 사용자에게 v0.4 예정 안내만 하고 종료.',
    }),
  },
  {
    title: 'S7 — REPORT 그룹 호출 (trigger_only 안내 확인)',
    userMessage: '주간 리포트 만들어줘.',
    pickGroup: 'REPORT',
    act: () => ({
      note: 'get_skill_group 응답이 status=trigger_only + tools=[]를 반환했으므로 에이전트는 채팅에서 호출 금지 안내만 하고 종료.',
    }),
  },
];

async function main(): Promise<void> {
  header('Step 0 — tools/list 시뮬레이션 (트림 효과 확인)');
  const allTools = listAllToolDescriptions();
  console.log(`총 도구 ${allTools.length}개 노출 (16 + get_skill_group)`);
  console.log(rule('-'));
  let totalChars = 0;
  for (const t of allTools) {
    const len = t.description.length;
    totalChars += len;
    // get_skill_group description은 라우팅 표라 길어도 의도된 길이.
    const tag = t.name === 'get_skill_group' ? '[router]' : '[trim ]';
    console.log(`${tag} ${t.name.padEnd(34)} ${len.toString().padStart(4)} chars`);
  }
  console.log(rule('-'));
  console.log(`description 총합: ${totalChars} chars`);
  const trimmedOnly = TOOL_DOCS.reduce(
    (acc, d) => acc + d.short_description.length,
    0,
  );
  console.log(`(get_skill_group 제외 16개 도구 합: ${trimmedOnly} chars)`);

  header('Step 1 — 7 그룹 라우팅 표 (get_skill_group description)');
  console.log(buildSkillGroupRoutingDescription());

  for (const sc of SCENARIOS) {
    header(sc.title);
    step('USER', sc.userMessage);

    const g = GROUP_DOCS[sc.pickGroup];
    step(
      'AGENT (라우팅)',
      [
        `라우팅 표를 보고 그룹 결정: ${sc.pickGroup}`,
        `이유: ${g.when_to_use}`,
      ].join('\n'),
    );

    const groupResponse = buildSkillGroupResponse(sc.pickGroup);
    step(
      `MCP CALL → get_skill_group({code:"${sc.pickGroup}"})`,
      preview({
        code: groupResponse.code,
        status: groupResponse.status,
        tools: groupResponse.tools.map((t) => ({
          name: t.name,
          quota: t.quota_cost,
        })),
        notes: groupResponse.notes,
      }),
    );

    if (groupResponse.status !== 'available') {
      step(
        'AGENT (결정)',
        `status=${groupResponse.status} → 도구 호출 중단. 사용자에게 안내만 전달.`,
      );
      const out = await sc.act();
      step('OUTCOME', preview(out));
      continue;
    }

    let result: unknown;
    try {
      result = await sc.act();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      step(
        'MCP CALL (실호출 — 실패)',
        `이 가상 E2E는 DB/네트워크 없이 실행됩니다. 실제 호출 실패는 정상.\n오류: ${msg}`,
      );
      continue;
    }
    if (
      result &&
      typeof result === 'object' &&
      'planned_tool_call' in (result as object)
    ) {
      const r = result as {
        planned_tool_call: { name: string; args: unknown };
        note?: string;
      };
      const doc = TOOL_DOCS_BY_NAME.get(r.planned_tool_call.name);
      step(
        'AGENT (도구 선택)',
        [
          `호출할 도구: ${r.planned_tool_call.name}`,
          doc ? `근거: ${doc.when_to_use}` : '',
          `인자: ${JSON.stringify(r.planned_tool_call.args)}`,
          r.note ? `메모: ${r.note}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      );
    } else {
      step('MCP CALL (실호출)', preview(result));
    }
  }

  header('완료');
  console.log('모든 시나리오 정상 진행. 위 출력을 확인하세요.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
