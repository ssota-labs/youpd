import type { NotionDatabaseSchema } from '../types';

export const pullContentCandidatesSchema: NotionDatabaseSchema = {
  key: 'pull_content_candidates',
  title: 'Pull Content Candidates 풀링콘텐츠 후보',
  description: '풀링콘텐츠 작업 공간 (주제·썸네일·댓글 인사이트·대본 초안)',
  icon: '🧲',
  properties: [
    { name: '제목', schema: { type: 'title', title: {} } },
    {
      name: '단계',
      schema: {
        type: 'status',
        status: {
          options: [
            { name: '1.주제리서치', color: 'default' },
            { name: '2.썸네일·제목', color: 'blue' },
            { name: '3.댓글리서치', color: 'yellow' },
            { name: '4.대본기획', color: 'orange' },
            { name: '완료', color: 'green' },
            { name: '폐기', color: 'red' },
          ],
        },
      },
    },
    {
      name: '연결된 키워드',
      schema: { type: 'relation', relation: { database_ref: 'keywords' } },
    },
    {
      name: '참고 영상',
      schema: { type: 'relation', relation: { database_ref: 'videos' } },
    },
    { name: '주제 메모', schema: { type: 'rich_text', rich_text: {} } },
    { name: '썸네일 시안', schema: { type: 'files', files: {} } },
    { name: '제목 후보', schema: { type: 'rich_text', rich_text: {} } },
    { name: '댓글 인사이트', schema: { type: 'rich_text', rich_text: {} } },
    { name: '후킹 (초반 30초)', schema: { type: 'rich_text', rich_text: {} } },
    { name: '본문 흐름', schema: { type: 'rich_text', rich_text: {} } },
    { name: '중간 질문', schema: { type: 'rich_text', rich_text: {} } },
    {
      name: '목표 지표',
      schema: {
        type: 'multi_select',
        multi_select: {
          options: [
            { name: '조회수' },
            { name: '좋아요' },
            { name: '구독 전환' },
            { name: '시청 완료율' },
          ],
        },
      },
    },
    {
      name: '제작 우선순위',
      schema: {
        type: 'select',
        select: {
          options: [
            { name: 'High', color: 'red' },
            { name: 'Med', color: 'yellow' },
            { name: 'Low', color: 'gray' },
          ],
        },
      },
    },
    { name: '담당', schema: { type: 'people', people: {} } },
    {
      name: '키콘 연결',
      schema: {
        type: 'relation',
        relation: { database_ref: 'key_content_candidates' },
      },
    },
  ],
};
