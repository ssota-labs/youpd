import { z } from 'zod';
import { NotionProp, type NotionPagePayload } from '../notion-payload';
import { runWithBudget } from '../quota';

// Stages must match the Key Content Candidates schema status options exactly
// (see packages/api/src/mcp/version/schemas/keyContentCandidates.ts).
const Stage = z.enum([
  '1.수집',
  '2.검증',
  '3.명사판단',
  '4.판매논리',
  '완료',
  '폐기',
]);
const NounType = z.enum(['고유명사', '일반명사', '보류→역추적']);
const Priority = z.enum(['High', 'Med', 'Low']);

const TrapsSchema = z
  .object({
    intent_meta_clear: z.boolean().optional(),
    key_content_confirmed: z.boolean().optional(),
    topic_impact: z.boolean().optional(),
    product_is_answer: z.boolean().optional(),
    customer_is_viewer: z.boolean().optional(),
    note: z.string().max(2000).optional(),
  })
  .strict();

export const NotionCreateKeyCandidateInputSchema = z
  .object({
    title: z.string().min(1).max(200),
    stage: Stage.default('1.수집'),
    keyword_page_ids: z.array(z.string().min(1)).default([]),
    reference_video_page_ids: z.array(z.string().min(1)).default([]),
    pull_candidate_page_ids: z.array(z.string().min(1)).default([]),
    traps: TrapsSchema.optional(),
    noun_type: NounType.optional(),
    feature_text: z.string().max(2000).optional(),
    problem_text: z.string().max(2000).optional(),
    sales_logic_draft: z.string().max(2000).optional(),
    production_priority: Priority.optional(),
    owner_user_ids: z.array(z.string().min(1)).default([]),
  })
  .strict();
export type NotionCreateKeyCandidateInput = z.infer<
  typeof NotionCreateKeyCandidateInputSchema
>;

// Builds a Notion `pages.create` properties payload for the Key Content
// Candidates DB. The agent supplies parent.database_id from Agent Meta.
export async function notionCreateKeyCandidate(
  input: NotionCreateKeyCandidateInput,
): Promise<NotionPagePayload> {
  const { result } = await runWithBudget<NotionPagePayload>({
    operation: 'compose-key-candidate',
    units: 0,
    call: async () => {
      const t = input.traps ?? {};
      const payload: NotionPagePayload = {
        database_ref: 'key_content_candidates',
        icon: { type: 'emoji', emoji: '🎯' },
        properties: {
          '주제': NotionProp.title(input.title),
          '단계': NotionProp.status(input.stage),
          '연결된 키워드': NotionProp.relation(input.keyword_page_ids),
          '참고 영상': NotionProp.relation(input.reference_video_page_ids),
          '풀링 연결': NotionProp.relation(input.pull_candidate_page_ids),
          '함정 — 기도메타 아님': NotionProp.checkbox(t.intent_meta_clear ?? false),
          '함정 — 키콘텐츠 맞음': NotionProp.checkbox(t.key_content_confirmed ?? false),
          '함정 — 주제 영향': NotionProp.checkbox(t.topic_impact ?? false),
          '함정 — 상품=답': NotionProp.checkbox(t.product_is_answer ?? false),
          '함정 — 고객=시청자': NotionProp.checkbox(t.customer_is_viewer ?? false),
          '함정 메모': NotionProp.richText(t.note),
          '명사 유형 결정': NotionProp.select(input.noun_type),
          '기능·장점·특징': NotionProp.richText(input.feature_text),
          '해결 문제': NotionProp.richText(input.problem_text),
          '판매논리 초안': NotionProp.richText(input.sales_logic_draft),
          '제작 우선순위': NotionProp.select(input.production_priority),
          '담당': NotionProp.people(input.owner_user_ids),
        },
      };
      return { resultCount: 1, payload };
    },
  });

  return result;
}
