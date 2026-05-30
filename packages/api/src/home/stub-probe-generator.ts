import { randomUUID } from 'node:crypto';
import type { HomeProfileInput, KeywordProbe } from '@youpd/types';
import { mapSkillsStageToProduct } from './consumer-stage-map';

type DraftProbe = Omit<KeywordProbe, 'id' | 'generationRunId' | 'linkedHarvestId'>;

function tokenize(text: string): string[] {
  return text
    .split(/[\n,、·/]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2)
    .slice(0, 8);
}

function isSeoOnlyProbe(probe: DraftProbe): boolean {
  const words = probe.probeLabel.split(/\s+/).filter(Boolean);
  if (words.length <= 1 && probe.rationale.length < 20) return true;
  if (!probe.audience || !probe.problemOrSituation) return true;
  return false;
}

/** Deterministic probe drafts from profile text (no LLM). */
export function generateStubProbes(profile: HomeProfileInput): DraftProbe[] {
  const topics = tokenize(profile.interestTopics);
  const themes = topics.length > 0 ? topics : ['콘텐츠 기획'];
  const excluded = new Set(profile.excludedTopics.map((t) => t.toLowerCase()));

  const drafts: DraftProbe[] = [];

  for (let i = 0; i < Math.min(themes.length, 3); i++) {
    const theme = themes[i]!;
    if (excluded.has(theme.toLowerCase())) continue;

    const stage =
      i === 0
        ? mapSkillsStageToProduct('desire')
        : i === 1
          ? mapSkillsStageToProduct('plan')
          : mapSkillsStageToProduct('action');

    const draft: DraftProbe = {
      probeLabel: `${theme} 레퍼런스 풀`,
      audience: profile.channelDescription.slice(0, 120) || '타깃 시청자',
      seedTheme: theme,
      problemOrSituation: `${theme} 관련 반복되는 문제·상황을 레퍼런스로 수집`,
      goal: '오프닝·전개 패턴이 검증된 영상 후보 확보',
      consumerStage: stage,
      rationale: `입력하신 관심 주제 “${theme}”와 채널 설명을 바탕으로 한 규칙 기반 프로브입니다. SEO 단어 목록이 아닌 레퍼런스 탐색용입니다.`,
      searchStatus: 'not_run',
      suggestedKeywords: [theme, `${theme} 방법`, `${theme} 사례`].filter(
        (kw) => !excluded.has(kw.toLowerCase()),
      ),
      status: 'draft',
      confidence: 'medium',
    };

    if (!isSeoOnlyProbe(draft)) {
      drafts.push(draft);
    }
  }

  if (drafts.length < 2 && themes[0]) {
    const fallback: DraftProbe = {
      probeLabel: '채널 맥락 기반 탐색 프로브',
      audience: '입력 프로필과 유사한 시청자층',
      seedTheme: themes[0],
      problemOrSituation: profile.channelDescription.slice(0, 200),
      goal: '기획·제작 레퍼런스 후보 수집',
      consumerStage: mapSkillsStageToProduct('mixed'),
      rationale:
        'AI 추천이 설정되지 않아 규칙 기반 샘플 프로브를 생성했습니다. 수동으로 편집하거나 검색을 실행할 수 있습니다.',
      searchStatus: 'not_run',
      suggestedKeywords: themes.slice(0, 3),
      status: 'draft',
      confidence: 'low',
    };
    if (!isSeoOnlyProbe(fallback)) drafts.push(fallback);
  }

  return drafts.slice(0, 6);
}

export function assignProbeIds(
  drafts: DraftProbe[],
  generationRunId: string,
): KeywordProbe[] {
  return drafts.map((draft) => ({
    ...draft,
    id: randomUUID(),
    generationRunId,
  }));
}
