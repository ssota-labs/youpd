import { describe, expect, it, vi } from 'vitest';
import { notionCreatePullCandidate } from './notion-create-pull-candidate';
import { SCHEMA_BY_KEY } from '../version/index';

vi.mock('../quota', () => ({
  attachQuotaSession: (result: unknown, sid: string | null) =>
    sid == null
      ? result
      : { ...(result as Record<string, unknown>), quota_session_id: sid },
  runWithBudget: async <T>(input: {
    units: number;
    call: () => Promise<{ resultCount: number; payload: T }>;
  }) => {
    const { payload } = await input.call();
    return { result: payload, unitsConsumed: input.units, sessionId: null };
  },
  QuotaExceededAtBudgetError: class extends Error {},
}));

describe('notionCreatePullCandidate', () => {
  it('produces a Notion-shaped payload targeting pull_content_candidates', async () => {
    const out = await notionCreatePullCandidate({
      title: '시니어 무릎통증 풀링 영상',
      stage: '2.썸네일·제목',
      keyword_page_ids: ['kw1'],
      reference_video_page_ids: ['v1', 'v2'],
      key_candidate_page_ids: ['key1'],
      topic_note: '무릎통증을 가볍게 다루는 컨셉',
      title_drafts: ['무릎 펴기 30초 루틴', '의자 없이도 가능한 운동'],
      hook_30s: '30초 안에 통증을 줄이는 루틴',
      body_outline: '도입 → 시범 → 변형 → 마무리',
      mid_questions: '여러분도 해보셨나요?',
      comment_insight: '비교 글이 많고 통증 부위가 다양함',
      thumbnail_urls: [
        { name: 'draft1.png', url: 'https://example.com/d1.png' },
      ],
      target_metrics: ['조회수', '시청 완료율'],
      production_priority: 'Med',
      owner_user_ids: ['u-felix'],
    });

    expect(out.database_ref).toBe('pull_content_candidates');
    expect(out.icon).toEqual({ type: 'emoji', emoji: '🧲' });

    const p = out.properties;
    expect(p['제목']).toEqual({
      title: [{ text: { content: '시니어 무릎통증 풀링 영상' } }],
    });
    expect(p['단계']).toEqual({ status: { name: '2.썸네일·제목' } });
    expect(p['제목 후보']).toEqual({
      rich_text: [
        { text: { content: '무릎 펴기 30초 루틴\n의자 없이도 가능한 운동' } },
      ],
    });
    expect(p['썸네일 시안']).toEqual({
      files: [
        {
          name: 'draft1.png',
          external: { url: 'https://example.com/d1.png' },
          type: 'external',
        },
      ],
    });
    expect(p['목표 지표']).toEqual({
      multi_select: [{ name: '조회수' }, { name: '시청 완료율' }],
    });
    expect(p['키콘 연결']).toEqual({ relation: [{ id: 'key1' }] });
  });

  it('every emitted property name exists on the published schema', async () => {
    const out = await notionCreatePullCandidate({
      title: 't',
      stage: '1.주제리서치',
      keyword_page_ids: [],
      reference_video_page_ids: [],
      key_candidate_page_ids: [],
      title_drafts: [],
      thumbnail_urls: [],
      target_metrics: [],
      owner_user_ids: [],
    });
    const schema = SCHEMA_BY_KEY.get('pull_content_candidates')!;
    const known = new Set(schema.properties.map((p) => p.name));
    for (const key of Object.keys(out.properties)) {
      expect(known.has(key)).toBe(true);
    }
  });
});
