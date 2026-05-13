import type { NotionDatabaseSchema } from '../types';

export const searchSessionsSchema: NotionDatabaseSchema = {
  key: 'search_sessions',
  title: 'Search Sessions 검색 세션',
  description: 'YouTube Data API 호출 기록 (날짜, 키워드, 반환 수, 소모 할당량)',
  icon: '🧾',
  properties: [
    { name: '세션ID', schema: { type: 'title', title: {} } },
    { name: '실행일시', schema: { type: 'date', date: {} } },
    {
      name: '키워드',
      schema: { type: 'relation', relation: { database_ref: 'keywords' } },
    },
    {
      name: '조작 종류',
      schema: {
        type: 'select',
        select: {
          options: [
            { name: 'video-search', color: 'blue' },
            { name: 'channel-search', color: 'blue' },
            { name: 'video-detail', color: 'gray' },
            { name: 'channel-detail', color: 'gray' },
            { name: 'channel-all-videos', color: 'gray' },
            { name: 'video-comments', color: 'purple' },
            { name: 'daily-snapshot', color: 'green' },
            { name: 'hot-chart', color: 'orange' },
            { name: 'trending-keyword', color: 'orange' },
          ],
        },
      },
    },
    {
      name: '결과 수',
      schema: { type: 'number', number: { format: 'number_with_commas' } },
    },
    {
      name: '소모 할당량(units)',
      schema: { type: 'number', number: { format: 'number_with_commas' } },
    },
    {
      name: '상태',
      schema: {
        type: 'select',
        select: {
          options: [
            { name: '성공', color: 'green' },
            { name: '실패', color: 'red' },
            { name: '할당초과', color: 'orange' },
          ],
        },
      },
    },
    { name: '메모', schema: { type: 'rich_text', rich_text: {} } },
  ],
};
