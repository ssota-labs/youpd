import { z } from 'zod';
import {
  NotionProp,
  type FileEntry,
  type NotionPagePayload,
} from '../notion-payload';
import { runWithBudget } from '../quota';

const Stage = z.enum([
  '1.주제리서치',
  '2.썸네일·제목',
  '3.댓글리서치',
  '4.대본기획',
  '완료',
  '폐기',
]);
const Priority = z.enum(['High', 'Med', 'Low']);
const Metric = z.enum(['조회수', '좋아요', '구독 전환', '시청 완료율']);

const ThumbnailFileSchema = z
  .object({
    name: z.string().min(1).max(200),
    url: z.string().url(),
  })
  .strict();

export const NotionCreatePullCandidateInputSchema = z
  .object({
    title: z.string().min(1).max(200),
    stage: Stage.default('1.주제리서치'),
    keyword_page_ids: z.array(z.string().min(1)).default([]),
    reference_video_page_ids: z.array(z.string().min(1)).default([]),
    key_candidate_page_ids: z.array(z.string().min(1)).default([]),
    topic_note: z.string().max(2000).optional(),
    title_drafts: z.array(z.string().min(1).max(200)).default([]),
    hook_30s: z.string().max(2000).optional(),
    body_outline: z.string().max(2000).optional(),
    mid_questions: z.string().max(2000).optional(),
    comment_insight: z.string().max(2000).optional(),
    thumbnail_urls: z.array(ThumbnailFileSchema).default([]),
    target_metrics: z.array(Metric).default([]),
    production_priority: Priority.optional(),
    owner_user_ids: z.array(z.string().min(1)).default([]),
  })
  .strict();
export type NotionCreatePullCandidateInput = z.infer<
  typeof NotionCreatePullCandidateInputSchema
>;

export async function notionCreatePullCandidate(
  input: NotionCreatePullCandidateInput,
): Promise<NotionPagePayload> {
  const { result } = await runWithBudget<NotionPagePayload>({
    operation: 'compose-pull-candidate',
    units: 0,
    call: async () => {
      const files: FileEntry[] = input.thumbnail_urls.map((f) => ({
        name: f.name,
        external: { url: f.url },
        type: 'external',
      }));
      // Notion rich_text wraps each draft as a separate line — join with \n
      // so the agent gets one block with line breaks rather than 1 chunk.
      const titleDrafts = input.title_drafts.join('\n');

      const payload: NotionPagePayload = {
        database_ref: 'pull_content_candidates',
        icon: { type: 'emoji', emoji: '🧲' },
        properties: {
          '제목': NotionProp.title(input.title),
          '단계': NotionProp.status(input.stage),
          '연결된 키워드': NotionProp.relation(input.keyword_page_ids),
          '참고 영상': NotionProp.relation(input.reference_video_page_ids),
          '키콘 연결': NotionProp.relation(input.key_candidate_page_ids),
          '주제 메모': NotionProp.richText(input.topic_note),
          '제목 후보': NotionProp.richText(titleDrafts),
          '댓글 인사이트': NotionProp.richText(input.comment_insight),
          '후킹 (초반 30초)': NotionProp.richText(input.hook_30s),
          '본문 흐름': NotionProp.richText(input.body_outline),
          '중간 질문': NotionProp.richText(input.mid_questions),
          '썸네일 시안': NotionProp.files(files),
          '목표 지표': NotionProp.multiSelect(input.target_metrics),
          '제작 우선순위': NotionProp.select(input.production_priority),
          '담당': NotionProp.people(input.owner_user_ids),
        },
      };
      return { resultCount: 1, payload };
    },
  });

  return result;
}
