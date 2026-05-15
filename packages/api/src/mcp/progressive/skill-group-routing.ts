import { ALL_GROUP_CODES, GROUP_DOCS } from './groups';
import { getToolsForGroup } from './registry';
import type {
  GetSkillGroupOutput,
  GroupDoc,
  SkillGroupCode,
} from './types';

const ROUTING_INTRO =
  '유피디 스킬 그룹의 도구 사용법을 가져온다. 작업을 시작하기 전에 먼저 이 도구를 호출해 알맞은 그룹의 도구 사용법을 받아라.\n\n' +
  'v0.5: 대용량 수집·일괄 적재는 **Notion Worker 도구**(`checkWorkspace`, `videosByKeyword`, `channelAllVideos`, `videoComments`, `snapshotTrackedVideos`)가 REST를 호출한 뒤 사용자 템플릿 DB **data source**에 직접 쓰는 경로와 `apps/web` **REST**(`/api/youpd/rest`)를 우선한다. 동일 로직의 MCP 도구는 회귀 테스트·폴백용이다.';

export function buildSkillGroupRoutingDescription(): string {
  const lines: string[] = [ROUTING_INTRO, '', '그룹:'];
  for (const code of ALL_GROUP_CODES) {
    const g = GROUP_DOCS[code];
    lines.push(`- ${code}: ${g.when_to_use}${suffixFor(g)}`);
  }
  lines.push('');
  lines.push(
    '사용 패턴: (1) 사용자 의도에 맞는 그룹 코드를 위 표에서 고른다 → (2) get_skill_group({ code }) 호출 → (3) 응답의 tools[]에 있는 도구를 호출.',
  );
  return lines.join('\n');
}

function suffixFor(g: GroupDoc): string {
  if (g.status === 'reserved') return ' (v0.4 예정 — 현재 사용 불가)';
  if (g.status === 'trigger_only') return ' (트리거 전용 — 채팅에서 호출 금지)';
  return '';
}

export function buildSkillGroupResponse(
  code: SkillGroupCode,
): GetSkillGroupOutput {
  const group = GROUP_DOCS[code];
  const tools = getToolsForGroup(code).map((doc) => ({
    name: doc.name,
    description: doc.long_description,
    when_to_use: doc.when_to_use,
    example_calls: doc.example_calls,
    quota_cost: doc.quota_cost,
  }));
  return {
    code: group.code,
    name: group.name,
    status: group.status,
    description: group.description,
    when_to_use: group.when_to_use,
    example_intents: group.example_intents,
    tools,
    notes: group.notes,
  };
}
