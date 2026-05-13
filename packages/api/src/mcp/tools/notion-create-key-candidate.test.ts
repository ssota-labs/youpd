import { describe, expect, it, vi } from 'vitest';
import { notionCreateKeyCandidate } from './notion-create-key-candidate';
import { SCHEMA_BY_KEY } from '../version/index';

vi.mock('../quota', () => ({
  runWithBudget: async <T>(input: {
    units: number;
    call: () => Promise<{ resultCount: number; payload: T }>;
  }) => {
    const { payload } = await input.call();
    return { result: payload, unitsConsumed: input.units };
  },
  QuotaExceededAtBudgetError: class extends Error {},
}));

describe('notionCreateKeyCandidate', () => {
  it('produces a Notion-shaped payload targeting key_content_candidates', async () => {
    const out = await notionCreateKeyCandidate({
      title: '시니어 무릎통증 키콘텐츠',
      stage: '2.검증',
      keyword_page_ids: ['kw1', 'kw2'],
      reference_video_page_ids: ['v1'],
      pull_candidate_page_ids: [],
      traps: {
        intent_meta_clear: true,
        key_content_confirmed: true,
        topic_impact: false,
        product_is_answer: false,
        customer_is_viewer: true,
        note: '함정 5개 중 3개 통과',
      },
      noun_type: '일반명사',
      feature_text: '무릎 보호대 핵심 기능 3가지',
      problem_text: '고령자 무릎 통증 일상 제약',
      sales_logic_draft: '문제 → 원인 → 해결',
      production_priority: 'High',
      owner_user_ids: ['u-felix'],
    });

    expect(out.database_ref).toBe('key_content_candidates');
    expect(out.icon).toEqual({ type: 'emoji', emoji: '🎯' });

    const p = out.properties;
    expect(p['주제']).toEqual({
      title: [{ text: { content: '시니어 무릎통증 키콘텐츠' } }],
    });
    expect(p['단계']).toEqual({ status: { name: '2.검증' } });
    expect(p['연결된 키워드']).toEqual({
      relation: [{ id: 'kw1' }, { id: 'kw2' }],
    });
    expect(p['함정 — 기도메타 아님']).toEqual({ checkbox: true });
    expect(p['함정 — 주제 영향']).toEqual({ checkbox: false });
    expect(p['함정 메모']).toEqual({
      rich_text: [{ text: { content: '함정 5개 중 3개 통과' } }],
    });
    expect(p['명사 유형 결정']).toEqual({ select: { name: '일반명사' } });
    expect(p['제작 우선순위']).toEqual({ select: { name: 'High' } });
    expect(p['담당']).toEqual({ people: [{ id: 'u-felix' }] });
  });

  it('every emitted property name exists on the published schema', async () => {
    const out = await notionCreateKeyCandidate({
      title: 't',
      stage: '1.수집',
      keyword_page_ids: [],
      reference_video_page_ids: [],
      pull_candidate_page_ids: [],
      owner_user_ids: [],
    });
    const schema = SCHEMA_BY_KEY.get('key_content_candidates')!;
    const known = new Set(schema.properties.map((p) => p.name));
    for (const key of Object.keys(out.properties)) {
      expect(known.has(key)).toBe(true);
    }
  });
});
