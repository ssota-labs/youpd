import type { NotionDatabaseSchema } from '../types';

export const keyContentCandidatesSchema: NotionDatabaseSchema = {
  key: 'key_content_candidates',
  title: 'Key Content Candidates 키콘텐츠 후보',
  description: '4단계 기획의 작업 공간 (함정 체크, 명사 판단, 판매논리)',
  icon: '🎯',
  properties: [
    { name: '주제', schema: { type: 'title', title: {} } },
    {
      name: '단계',
      schema: {
        type: 'status',
        status: {
          options: [
            { name: '1.수집', color: 'default' },
            { name: '2.검증', color: 'blue' },
            { name: '3.명사판단', color: 'yellow' },
            { name: '4.판매논리', color: 'orange' },
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
    { name: '함정 — 기도메타 아님', schema: { type: 'checkbox', checkbox: {} } },
    { name: '함정 — 키콘텐츠 맞음', schema: { type: 'checkbox', checkbox: {} } },
    { name: '함정 — 주제 영향', schema: { type: 'checkbox', checkbox: {} } },
    { name: '함정 — 상품=답', schema: { type: 'checkbox', checkbox: {} } },
    { name: '함정 — 고객=시청자', schema: { type: 'checkbox', checkbox: {} } },
    { name: '함정 메모', schema: { type: 'rich_text', rich_text: {} } },
    {
      name: '명사 유형 결정',
      schema: {
        type: 'select',
        select: {
          options: [
            { name: '고유명사', color: 'blue' },
            { name: '일반명사', color: 'gray' },
            { name: '보류→역추적', color: 'orange' },
          ],
        },
      },
    },
    { name: '기능·장점·특징', schema: { type: 'rich_text', rich_text: {} } },
    { name: '해결 문제', schema: { type: 'rich_text', rich_text: {} } },
    { name: '판매논리 초안', schema: { type: 'rich_text', rich_text: {} } },
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
      name: '풀링 연결',
      schema: {
        type: 'relation',
        relation: { database_ref: 'pull_content_candidates' },
      },
    },
  ],
};
