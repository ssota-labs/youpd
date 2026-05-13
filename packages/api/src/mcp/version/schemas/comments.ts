import type { NotionDatabaseSchema } from '../types';

export const commentsSchema: NotionDatabaseSchema = {
  key: 'comments',
  title: 'Comments 댓글',
  description: '영상당 좋아요 TOP 50 댓글 — 원고 작성 에이전트의 1차 코퍼스',
  icon: '💬',
  properties: [
    { name: '제목', schema: { type: 'title', title: {} } },
    { name: 'commentId', schema: { type: 'rich_text', rich_text: {} } },
    {
      name: '영상',
      schema: { type: 'relation', relation: { database_ref: 'videos' } },
    },
    { name: '작성자', schema: { type: 'rich_text', rich_text: {} } },
    { name: '작성자 채널ID', schema: { type: 'rich_text', rich_text: {} } },
    { name: '본문', schema: { type: 'rich_text', rich_text: {} } },
    {
      name: '좋아요수',
      schema: { type: 'number', number: { format: 'number_with_commas' } },
    },
    {
      name: '답글수',
      schema: { type: 'number', number: { format: 'number' } },
    },
    { name: '작성일시', schema: { type: 'date', date: {} } },
    {
      name: '언어',
      schema: {
        type: 'select',
        select: {
          options: [
            { name: 'ko', color: 'red' },
            { name: 'en', color: 'blue' },
            { name: 'ja', color: 'orange' },
            { name: 'zh', color: 'yellow' },
            { name: '기타', color: 'gray' },
          ],
        },
      },
    },
    {
      name: '감정',
      schema: {
        type: 'select',
        select: {
          options: [
            { name: '긍정', color: 'green' },
            { name: '중립', color: 'gray' },
            { name: '부정', color: 'red' },
            { name: '질문', color: 'blue' },
            { name: '칭찬', color: 'green' },
            { name: '불만', color: 'red' },
            { name: '비교', color: 'orange' },
            { name: '요청', color: 'yellow' },
          ],
        },
      },
    },
    {
      name: '주제 태그',
      schema: {
        type: 'multi_select',
        multi_select: {
          options: [
            { name: '사용감' },
            { name: '가격' },
            { name: '비교' },
            { name: '효과' },
            { name: '안전' },
            { name: '사용법' },
            { name: '후기' },
            { name: '구매의사' },
            { name: '의문' },
            { name: '가족' },
          ],
        },
      },
    },
    { name: '인사이트 요약', schema: { type: 'rich_text', rich_text: {} } },
    {
      name: '원고 활용 가능성',
      schema: {
        type: 'select',
        select: {
          options: [
            { name: '★★★ 키콘', color: 'green' },
            { name: '★★ 풀링', color: 'blue' },
            { name: '★ 참고', color: 'gray' },
            { name: '- 무관', color: 'default' },
          ],
        },
      },
    },
    {
      name: '키콘 연결',
      schema: {
        type: 'relation',
        relation: { database_ref: 'key_content_candidates' },
      },
    },
    {
      name: '풀링 연결',
      schema: {
        type: 'relation',
        relation: { database_ref: 'pull_content_candidates' },
      },
    },
    { name: '수집일', schema: { type: 'date', date: {} } },
  ],
};
