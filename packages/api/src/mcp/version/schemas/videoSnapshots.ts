import type { NotionDatabaseSchema } from '../types';

export const videoSnapshotsSchema: NotionDatabaseSchema = {
  key: 'video_snapshots',
  title: 'Video Snapshots 일별 스냅샷',
  description: '영상의 일별 조회수·좋아요·댓글 시계열 (노출확률 시간창 입력)',
  icon: '📈',
  properties: [
    { name: 'ID', schema: { type: 'title', title: {} } },
    {
      name: '영상',
      schema: { type: 'relation', relation: { database_ref: 'videos' } },
    },
    { name: '스냅샷일', schema: { type: 'date', date: {} } },
    {
      name: '조회수',
      schema: { type: 'number', number: { format: 'number_with_commas' } },
    },
    {
      name: '좋아요',
      schema: { type: 'number', number: { format: 'number_with_commas' } },
    },
    {
      name: '댓글수',
      schema: { type: 'number', number: { format: 'number_with_commas' } },
    },
    {
      name: '전일 대비 증가',
      schema: { type: 'number', number: { format: 'number_with_commas' } },
    },
  ],
};
