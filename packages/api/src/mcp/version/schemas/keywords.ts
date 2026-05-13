import type { NotionDatabaseSchema } from '../types';

export const keywordsSchema: NotionDatabaseSchema = {
  key: 'keywords',
  title: 'Keywords 키워드',
  description: '추적 중인 키워드, 우선순위, 명사 유형, 마지막 수집일',
  icon: '🔑',
  properties: [
    { name: '키워드', schema: { type: 'title', title: {} } },
    {
      name: '명사 유형',
      schema: {
        type: 'select',
        select: {
          options: [
            { name: '고유', color: 'blue' },
            { name: '일반', color: 'gray' },
            { name: '문제', color: 'orange' },
          ],
        },
      },
    },
    {
      name: '우선순위',
      schema: {
        type: 'select',
        select: {
          options: [
            { name: '1순 브랜드', color: 'red' },
            { name: '2순 카테고리', color: 'orange' },
            { name: '3순 문제', color: 'yellow' },
            { name: '4순 역검색', color: 'gray' },
          ],
        },
      },
    },
    {
      name: '상태',
      schema: {
        type: 'status',
        status: {
          options: [
            { name: '수집전', color: 'default' },
            { name: '수집중', color: 'blue' },
            { name: '검증중', color: 'yellow' },
            { name: '채택', color: 'green' },
            { name: '탈락', color: 'red' },
          ],
        },
      },
    },
    {
      name: '마지막 수집일',
      schema: { type: 'date', date: {} },
    },
    { name: '담당 기획자', schema: { type: 'people', people: {} } },
    {
      name: '연결된 영상',
      schema: { type: 'relation', relation: { database_ref: 'videos' } },
    },
    {
      name: '연결된 채널',
      schema: { type: 'relation', relation: { database_ref: 'channels' } },
    },
    {
      name: '키콘 후보',
      schema: {
        type: 'relation',
        relation: { database_ref: 'key_content_candidates' },
      },
    },
    {
      name: '풀링 후보',
      schema: {
        type: 'relation',
        relation: { database_ref: 'pull_content_candidates' },
      },
    },
  ],
};
