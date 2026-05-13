import type { NotionDatabaseSchema } from '../types';

export const hotVideoDailySchema: NotionDatabaseSchema = {
  key: 'hot_video_daily',
  title: 'Hot Video Daily 일자별 핫비디오',
  description: '뷰트랩 핫비디오 대체 — 일자별 차트·24h 급상승 영상 진입 기록',
  icon: '🔥',
  properties: [
    { name: 'ID', schema: { type: 'title', title: {} } },
    { name: '진입일', schema: { type: 'date', date: {} } },
    {
      name: '차트 순위',
      schema: { type: 'number', number: { format: 'number' } },
    },
    {
      name: 'regionCode',
      schema: {
        type: 'select',
        select: {
          options: [
            { name: 'KR' },
            { name: 'US' },
            { name: 'JP' },
            { name: 'GB' },
            { name: 'DE' },
          ],
        },
      },
    },
    {
      name: 'videoCategoryId',
      schema: {
        type: 'select',
        select: {
          options: [
            { name: '전체', color: 'default' },
            { name: '22 People & Blogs', color: 'blue' },
            { name: '24 Entertainment', color: 'orange' },
            { name: '25 News & Politics', color: 'red' },
            { name: '26 Howto & Style', color: 'yellow' },
            { name: '27 Education', color: 'green' },
          ],
        },
      },
    },
    {
      name: '영상',
      schema: { type: 'relation', relation: { database_ref: 'videos' } },
    },
    {
      name: '출처',
      schema: {
        type: 'select',
        select: {
          options: [
            { name: 'chart=mostPopular', color: 'green' },
            { name: 'search.recent24h', color: 'blue' },
            { name: 'snapshot-Δ24h', color: 'orange' },
          ],
        },
      },
    },
    {
      name: '시드 키워드',
      schema: { type: 'relation', relation: { database_ref: 'keywords' } },
    },
    {
      name: '차트 진입 시 조회수',
      schema: { type: 'number', number: { format: 'number_with_commas' } },
    },
    {
      name: '24시간 조회수 Δ',
      schema: { type: 'number', number: { format: 'number_with_commas' } },
    },
    { name: '제목 패턴 메모', schema: { type: 'rich_text', rich_text: {} } },
    {
      name: '수식어 추출',
      schema: { type: 'multi_select', multi_select: { options: [] } },
    },
    {
      name: '풀링 후보 연결',
      schema: {
        type: 'relation',
        relation: { database_ref: 'pull_content_candidates' },
      },
    },
  ],
};
