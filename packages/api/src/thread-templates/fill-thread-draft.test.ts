import { describe, expect, it } from 'vitest';
import { generateThreadDraft } from './fill-thread-draft';

describe('generateThreadDraft', () => {
  it('fills deterministic scaffold from topic and skeleton', () => {
    const result = generateThreadDraft({
      templateId: '00000000-0000-4000-8000-000000000001',
      skeletonJson: {
        version: 1,
        slotOrder: ['hook', 'tension', 'insight', 'cta'],
        postCountHint: 4,
        locale: 'ko',
      },
      topic: '알고리즘 실험 결과를 공유합니다. CTR이 2배 올랐어요.',
      audience: '1인 크리에이터',
      locale: 'ko',
      sourceEvidenceIds: [],
      sourceSocialPostIds: [],
      sourceMode: 'imported_seed',
    });

    expect(result.status).toBe('succeeded');
    expect(result.draftText).toContain('【훅】');
    expect(result.draftText).toContain('【행동 유도】');
    expect(result.parts?.length).toBe(4);
    expect(result.lineage.generator).toBe('deterministic');
    expect(result.lineage.promptVersion).toBe('thread_gen_v1');
  });
});
